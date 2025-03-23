/**
 * @license GPL-3.0-or-later
 * Deno-PLC
 *
 * Copyright (C) 2025 Hans Schallmoser
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import type { Subscription } from "@nats-io/nats-core";
import { $pub_crate$_constructor, $pub_crate$_inner, $pub_crate$_map_subscriptions } from "./pub_crate.ts";
import { dispose_registry, logger, RetryManager, type RetryPolicy } from "./shared.ts";
import { MapSignal } from "@deno-plc/signal-utils/map";
import type { ValueType } from "@std/msgpack/encode";
import { decode } from "@std/msgpack/decode";
import { batch, effect, type Signal, signal } from "@deno-plc/signals";
import { awaitSignal } from "@deno-plc/signal-utils/async";
import type { NatsClient } from "./client.ts";
import { NATS_Status } from "./state_container.ts";
import { byteEquals } from "@deno-plc/utils/bytes";
import { wait } from "@deno-plc/utils/wait";
import type { z } from "zod";
import { serialize_zod_type, type ZodTypeDefWithKind } from "./zod.eq.ts";

/**
 * Options for subscribing to a map
 */
export interface MapSinkOptions<Schema extends z.ZodType<unknown, ZodTypeDefWithKind> = z.ZodType<unknown, ZodTypeDefWithKind>> {
    /**
     * allows MapSinks to fetch the latest value. Recommended for values that do not change on a regular basis.
     * @default true
     */
    readonly enable_fetching?: boolean;

    /**
     * It there is no message for this amount of time, the value will be marked as invalid.
     * `periodic_update` or `periodic_advertise` should be enabled for the source
     * @default 0
     */
    readonly source_timeout?: number;

    /**
     * Retry policy for fetching the blob
     * @default NatsClient.default_retry_policy
     */
    readonly retry_policy?: RetryPolicy;

    /**
     * Zod Schema
     */
    schema: Schema;
}

interface ValidatedValue<
    Output = unknown,
    Def extends ZodTypeDefWithKind = ZodTypeDefWithKind,
    Schema extends z.ZodType<Output, Def> = z.ZodType<Output, Def>,
> {
    schema: Schema;
    schema_string: string | null;
    value: MapSignal<string, Output | null>;
    updated: boolean;
    instances: number;
}

/**
 * @internal
 */
export class MapSinkInner {
    private constructor(
        readonly client: NatsClient,
        readonly subject: string,
        readonly opt: Omit<Required<MapSinkOptions<z.ZodType<unknown, ZodTypeDefWithKind>>>, "schema">,
    ) {
        this.#retry = new RetryManager(this.opt.retry_policy);
        this.#subscription = client.subscribe(`%map_sink_v2%.${subject}`);

        this.#run().then();

        if (opt.enable_fetching) {
            this.#fetch_loop();
        }
        this.#disconnect_handler_release = effect(() => {
            if (this.client.nats_status.value !== NATS_Status.Connected) {
                this.valid.value = false;
            }
        });

        this.#reset_timeout();
    }
    static [$pub_crate$_constructor](
        client: NatsClient,
        subject: string,
        opt?: MapSinkOptions<z.ZodType<unknown, ZodTypeDefWithKind>>,
    ): MapSinkInner {
        return new MapSinkInner(client, subject, {
            enable_fetching: true,
            source_timeout: 0,
            retry_policy: client.default_retry_policy,
            ...opt,
        });
    }

    #subscription: Subscription;
    #disconnect_handler_release: VoidFunction;
    #timeout: number = -1;

    #retry: RetryManager;

    readonly raw_value: MapSignal<string, ValueType> = new MapSignal();
    readonly validated: Map<z.ZodType, ValidatedValue> = new Map();
    readonly schema_resolved_aliases: WeakMap<z.ZodType, ValidatedValue> = new WeakMap();

    static primitive_schemas: Map<string, z.ZodType> = new Map();

    readonly valid: Signal<boolean> = signal(false);

    #last_change_id = new Uint8Array(16);

    instances = 0;
    destroyed = false;
    destroy_abort: AbortController = new AbortController();

    #reset_timeout() {
        clearTimeout(this.#timeout);
        if (this.opt.source_timeout) {
            this.#timeout = setTimeout(() => {
                this.valid.value = false;
            }, this.opt.source_timeout);
        }
    }

    async #fetch_loop() {
        while (!this.destroyed) {
            await awaitSignal(this.valid, false);
            if (this.destroyed) break;
            await awaitSignal(this.client.nats_status, NATS_Status.Connected);
            if (this.destroyed) break;

            try {
                const msg = await this.client.request(`%map_source_v2%.${this.subject}`);

                this.#apply_update(msg.data);
            } catch (err) {
                this.valid.value = false;
                const err_ = err as Error;
                if (err_.name !== "RequestError" || !String(err_.cause).startsWith("NoResponders")) {
                    logger.error`error fetching map ${this.subject}: ${err}`;
                }
            }

            await this.#retry.wait(this.destroy_abort.signal);
        }
    }

    async #run() {
        for await (const msg of this.#subscription) {
            this.#apply_update(msg.data);
        }
    }

    #apply_update(msg: Uint8Array) {
        if (msg.length < 17) {
            logger.getChild(this.subject).error`update message too short`;
            return;
        }
        this.#reset_timeout();
        const type = msg[0];
        const change_id = msg.slice(1, 17);

        let update: [string, ValueType][] = [];

        try {
            if (msg.length > 17) {
                update = Object.entries(decode(msg.slice(17)) as object);
            }
        } catch (e) {
            logger.getChild(this.subject).error`failed to apply MapSink update: ${e}`;
        }

        batch(() => {
            switch (type) {
                case 0x01: {
                    // full update
                    this.raw_value.clear();
                }
                /* falls through */
                case 0x02: {
                    // partial update
                    const validate: ValidatedValue[] = [];
                    for (const [, entry] of this.validated) {
                        if (entry.instances > 0) {
                            validate.push(entry);
                            if (type === 0x01) {
                                entry.value.clear();
                            }
                        } else {
                            entry.updated = false;
                            entry.value.clear();
                        }
                    }
                    for (const [key, value] of update) {
                        this.raw_value.set(key, value);
                        for (const entry of validate) {
                            const parsed = this.#validate(entry.schema, value);
                            entry.value.set(key, parsed);
                        }
                    }
                    this.#last_change_id = change_id;
                    this.raw_value.unsafe_force_update();
                    this.valid.value = true;
                    break;
                }

                case 0x03: {
                    // advertisement

                    if (!byteEquals(this.#last_change_id, change_id)) {
                        logger.getChild(this.subject).info`advertisement hash mismatch, fetching`;
                        this.valid.value = false;
                    }
                    break;
                }

                default: {
                    logger.getChild(this.subject).warn("unsupported update type", {
                        update_type: type,
                    });
                    break;
                }
            }
        });
    }

    #validate<Schema extends z.ZodType>(schema: Schema, value: ValueType): Schema["_output"] | null {
        const parsed = schema.safeParse(value);
        if (parsed.success) {
            return parsed.data;
        } else {
            logger.getChild(this.subject).error`failed to validate value: ${parsed.error.errors}`;
            return null;
        }
    }

    attach<Schema extends z.ZodType<Output, Def>, Output = unknown, Def extends ZodTypeDefWithKind = ZodTypeDefWithKind>(
        schema: Schema,
    ): ValidatedValue<Output, Def, Schema> {
        if (this.schema_resolved_aliases.has(schema)) {
            const value = this.schema_resolved_aliases.get(schema)! as ValidatedValue<Output, Def, Schema>;
            value.instances++;
            if (!value.updated) {
                const map = value.value.unsafe_get_inner_peek();
                map.clear();

                for (const [key, raw_value] of this.raw_value.unsafe_get_inner_peek()) {
                    const value = this.#validate(schema, raw_value);
                    map.set(key, value);
                }

                value.value.unsafe_force_update();
                value.updated = true;
            }
            return value;
        }

        const schema_string = serialize_zod_type(schema);
        if (schema_string !== null) {
            if (MapSinkInner.primitive_schemas.has(schema_string)) {
                const linked_schema = MapSinkInner.primitive_schemas.get(schema_string)! as Schema;
                if (linked_schema !== schema) {
                    const value = this.attach<Schema, Output, Def>(linked_schema);
                    this.schema_resolved_aliases.set(schema, value);
                    return value;
                }
            }

            MapSinkInner.primitive_schemas.set(schema_string, schema);
        }

        const value = new MapSignal<string, Output | null>(
            this.raw_value.unsafe_get_inner_peek().entries().map(([key, raw_value]) => [key, this.#validate(schema, raw_value)]),
        );

        const res = {
            schema,
            schema_string,
            value,
            updated: true,
            instances: 1,
        } satisfies ValidatedValue<Output, Def, Schema>;

        this.validated.set(schema, res);
        this.schema_resolved_aliases.set(schema, res);

        return res;
    }

    detach(schema: z.ZodType) {
        const value = this.schema_resolved_aliases.get(schema);
        if (value === undefined) {
            return;
        }

        value.instances--;
    }

    try_dispose() {
        if (this.instances === 0) {
            this.destroyed = true;
            this.client[$pub_crate$_map_subscriptions].delete(this.subject);
            this.#subscription.unsubscribe();
            clearTimeout(this.#timeout);
            this.destroy_abort.abort();
            this.#disconnect_handler_release();
            this.valid.value = false;
        }
    }
}

export interface MapSinkLike<T> extends AsyncDisposable {
    readonly value: MapSignal<string, T | null>;
    readonly raw_value: MapSignal<string, ValueType>;
    readonly valid: boolean;

    dispose(): Promise<void>;
}

export class MapSink<Schema extends z.ZodType<unknown, ZodTypeDefWithKind> = z.ZodAny> implements MapSinkLike<Schema["_output"]> {
    private constructor(inner: MapSinkInner, readonly schema: Schema) {
        this[$pub_crate$_inner] = inner;
        inner.instances++;
        this.#validated = inner.attach(schema as unknown as z.ZodType<unknown, ZodTypeDefWithKind>);
        dispose_registry.register(this, `subscription for ${this[$pub_crate$_inner].subject}`, this.#registration_id);
    }
    static [$pub_crate$_constructor]<Schema extends z.ZodType<unknown, ZodTypeDefWithKind>>(inner: MapSinkInner, schema: Schema): MapSink<Schema> {
        return new MapSink(inner, schema);
    }
    // for some reason Firefox does not like symbols as unregister tokens
    // #registration_id = Symbol();
    readonly #registration_id = {};
    #destroyed = false;
    readonly [$pub_crate$_inner]: MapSinkInner;
    readonly #validated: ValidatedValue;

    /**
     * Access the {@link MapSignal} that contains the current values of the map.
     */
    get value(): MapSignal<string, Schema["_output"] | null> {
        return this.#validated.value;
    }

    /**
     * Access the raw (unparsed) values of the map.
     */
    get raw_value(): MapSignal<string, ValueType> {
        return this[$pub_crate$_inner].raw_value;
    }

    /**
     * Indicates if the current value is considered valid. This is @preact/signals hook compatible
     */
    get valid(): boolean {
        return this[$pub_crate$_inner].valid.value;
    }

    async [Symbol.asyncDispose]() {
        if (this.#destroyed) {
            return;
        }
        this.#destroyed = true;
        this[$pub_crate$_inner].instances--;
        dispose_registry.unregister(this.#registration_id);
        // in hooks the old values are dropped first, so we need to wait a bit in case the subscription is used again
        await wait(100);
        this[$pub_crate$_inner].detach(this.schema);
        this[$pub_crate$_inner].try_dispose();
    }

    async dispose() {
        await this[Symbol.asyncDispose]();
    }
}
