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

/**
 * Options for subscribing to a map
 */
export interface MapSinkOptions {
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
}

/**
 * @internal
 */
export class MapSinkInner {
    private constructor(readonly client: NatsClient, readonly subject: string, readonly opt: Required<MapSinkOptions>) {
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
    static [$pub_crate$_constructor](client: NatsClient, subject: string, opt?: MapSinkOptions): MapSinkInner {
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
                logger.error`error fetching blob ${this.subject}: ${err}`;
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

        const map = this.raw_value.unsafe_get_inner_peek();

        let update: [string, ValueType][] = [];

        try {
            if (msg.length > 17) {
                update = Object.entries(decode(msg.slice(17)) as object);
            }
        } catch (e) {
            logger.getChild(this.subject).error`failed to apply MapSink update: ${e}`;
        }

        switch (type) {
            case 0x01: {
                // full update
                map.clear();
            }
            /* falls through */
            case 0x02: {
                // partial update
                for (const [key, value] of update) {
                    map.set(key, value);
                }
                this.#last_change_id = change_id;
                batch(() => {
                    this.raw_value.unsafe_force_update();
                    this.valid.value = true;
                });
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

export class MapSink {
    private constructor(inner: MapSinkInner) {
        this[$pub_crate$_inner] = inner;
        inner.instances++;
        dispose_registry.register(this, `subscription for ${this[$pub_crate$_inner].subject}`, this.#registration_id);
    }
    static [$pub_crate$_constructor](inner: MapSinkInner): MapSink {
        return new MapSink(inner);
    }

    #registration_id = Symbol();
    #destroyed = false;
    readonly [$pub_crate$_inner]: MapSinkInner;

    /**
     * Access the {@link MapSignal} that contains the current values of the map.
     */
    get value(): MapSignal<string, ValueType> {
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
        this[$pub_crate$_inner].try_dispose();
    }

    [Symbol.dispose]() {
        this[Symbol.asyncDispose]();
    }

    async dispose() {
        await this[Symbol.asyncDispose]();
    }
}
