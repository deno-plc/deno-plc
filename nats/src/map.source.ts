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
import { $pub_crate$_constructor } from "./pub_crate.ts";
import { dispose_registry, logger } from "./shared.ts";
import { encode, type ValueType } from "@std/msgpack/encode";
import type { NatsClient } from "./client.ts";

export interface MapSourceOptions {
    /**
     * Sends a full update every `periodic_update` milliseconds.
     */
    periodic_update?: number;

    /**
     * allows MapSinks to fetch the latest value. Recommended for values that do not change on a regular basis.
     * @default true
     */
    enable_fetching?: boolean;

    /**
     * @default true
     */
    allow_multicast_fetch?: boolean;
}

export class MapSource {
    #registration_id = Symbol();
    private constructor(readonly client: NatsClient, readonly subject: string, readonly options: MapSourceOptions) {
        dispose_registry.register(this, `subscription for ${this.subject}`, this.#registration_id);
        this.#periodic_update();

        if (this.options.enable_fetching ?? true) {
            this.#run_fetch();
        }
    }

    #fetch_subscription: Subscription | undefined;

    async #run_fetch() {
        this.#fetch_subscription = this.client.subscribe(`%map_source_v1%.${this.subject}`);
        for await (const msg of this.#fetch_subscription) {
            if (msg.reply) {
                msg.respond(encode(Object.fromEntries(this.#current_value.entries().map(([key, { value }]) => [key, value]))));
            } else {
                if (this.options.allow_multicast_fetch ?? true) {
                    this.#send_update(() => true);
                } else {
                    logger.getChild(this.subject).warn`Received multicast fetch request. [now allowed] Ignoring.`;
                }
            }
        }
    }

    periodic_timeout_id: number = -1;

    static [$pub_crate$_constructor](client: NatsClient, subject: string, options?: MapSourceOptions): MapSource {
        const src = new MapSource(client, subject, options ?? {});
        return src;
    }

    #current_value = new Map<string, { value: ValueType; last_update: number; }>();

    #send(content: ValueType) {
        this.client.publish(`%map_sink_v1%.${this.subject}`, encode(content));
    }

    #send_single(key: string, value: ValueType) {
        this.#send({
            [key]: value,
        });
    }

    #send_update(filter: (_: [string, { value: ValueType; last_update: number; }]) => boolean) {
        const now = performance.now();
        this.#send(Object.fromEntries(
            this
                .#current_value
                .entries()
                .filter(filter)
                .map(([key, $]) => {
                    $.last_update = now;
                    return [key, $.value];
                }),
        ));
    }

    set(key: string, value: ValueType) {
        if (value === undefined) {
            this.#current_value.delete(key);
        } else {
            this.#current_value.set(key, { value, last_update: performance.now() });
        }
        this.#send_single(key, value);
    }

    public update(data: Map<string, ValueType>): void {
        const now = performance.now();
        for (const [key, value] of data) {
            if (value === undefined) {
                this.#current_value.delete(key);
            } else {
                this.#current_value.set(key, { value, last_update: now });
            }
        }
        this.#send(Object.fromEntries(data.entries()));
    }

    #periodic_update() {
        clearTimeout(this.periodic_timeout_id);
        if (this.options.periodic_update ?? 0 > 0) {
            const weak_this = new WeakRef(this);

            this.periodic_timeout_id = setTimeout(() => {
                const self = weak_this.deref();
                if (!self) return;
                const now = performance.now();
                self.#send_update(([_, { last_update }]) => now - last_update > (self.options.periodic_update ?? 0));
                self.#periodic_update();
            });
        }
    }

    [Symbol.dispose]() {
        this.#fetch_subscription?.unsubscribe();
        dispose_registry.unregister(this.#registration_id);
        clearTimeout(this.periodic_timeout_id);
    }
}
