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
import { $pub_crate$_blob_subscriptions, $pub_crate$_constructor } from "./pub_crate.ts";
import { dispose_registry, logger } from "./shared.ts";
import { MapSignal } from "@deno-plc/signal-utils/map";
import type { ValueType } from "@std/msgpack/encode";
import { decode } from "@std/msgpack/decode";
import type { NatsClient } from "./client.ts";

/**
 * Options for subscribing to a map
 */
export interface MapSinkOptions {
    /**
     * allows MapSinks to fetch the latest value. Recommended for values that do not change on a regular basis.
     */
    readonly enable_fetching?: boolean;
}

export class MapSinkInner {
    constructor(readonly client: NatsClient, readonly subject: string, readonly opt: MapSinkOptions) {
        this.#subscription = client.subscribe(`%map_sink_v1%.${subject}`);

        this.#run().then();

        // if (opt.fetch === FetchStrategy.Unicast) {
        //     client.request(`%map_source_v1%.${subject}`).then((msg) => {
        //         this.#apply_update(msg.data);
        //     });
        // } else if (opt.fetch === FetchStrategy.Multicast) {
        //     client.publish(`%map_source_v1%.${subject}`, new Uint8Array());
        // }
    }

    #apply_update(msg: Uint8Array) {
        try {
            const map = this.value.unsafe_get_inner_peek();
            for (const [key, value] of Object.entries(decode(msg) as object)) {
                if (value !== undefined) {
                    map.set(key, value);
                } else {
                    map.delete(key);
                }
            }
        } catch (e) {
            logger.getChild(this.subject).error`failed to apply MapSink update: ${e}`;
        } finally {
            this.value.unsafe_force_update();
        }
    }

    async #run() {
        for await (const msg of this.#subscription) {
            this.#apply_update(msg.data);
        }
    }

    #subscription: Subscription;

    value: MapSignal<string, ValueType> = new MapSignal();

    instances = 0;

    try_dispose() {
        if (this.instances === 0) {
            this.client[$pub_crate$_blob_subscriptions].delete(this.subject);
            this.#subscription.unsubscribe();
        }
    }
}

export class MapSink {
    #registration_id = Symbol();
    private constructor(private readonly inner: MapSinkInner) {
        this.inner.instances++;
        dispose_registry.register(this, `subscription for ${this.inner.subject}`, this.#registration_id);
    }
    static [$pub_crate$_constructor](inner: MapSinkInner): MapSink {
        return new MapSink(inner);
    }

    /**
     * Access the {@link MapSignal} that contains the current values of the map.
     */
    get value(): MapSignal<string, ValueType> {
        return this.inner.value;
    }

    [Symbol.dispose]() {
        this.inner.instances--;
        dispose_registry.unregister(this.#registration_id);
        // in hooks the old values are dropped first, so we need to wait a bit in case the subscription is used again
        setTimeout(() => {
            this.inner.try_dispose();
        }, 100);
    }

    dispose() {
        this[Symbol.dispose]();
    }
}
