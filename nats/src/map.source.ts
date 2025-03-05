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
import { dispose_registry } from "./shared.ts";
import { encode, type ValueType } from "@std/msgpack/encode";
import type { NatsClient } from "./client.ts";

export interface MapSourceOptions {
    /**
     * Sends a full update every `periodic_update` milliseconds.
     * @default 0
     */
    readonly periodic_update?: number;

    /**
     * Send a version advertisement every `periodic_advertise` milliseconds.
     * @default 0
     */
    readonly periodic_advertise?: number;

    /**
     * allows MapSinks to fetch the latest value. Recommended for values that do not change on a regular basis.
     * @default true
     */
    readonly enable_fetching?: boolean;
}

export class MapSource<T extends ValueType = ValueType> {
    private constructor(readonly client: NatsClient, readonly subject: string, readonly options: Required<MapSourceOptions>) {
        this.#current_change_id = new Uint8Array(16);
        crypto.getRandomValues(this.#current_change_id);

        dispose_registry.register(this, `subscription for ${this.subject}`, this.#registration_id);
        this.#periodic_update();

        if (this.options.enable_fetching) {
            this.#run_fetch();
        }
    }

    static [$pub_crate$_constructor]<T extends ValueType = ValueType>(client: NatsClient, subject: string, options?: MapSourceOptions): MapSource<T> {
        const src = new MapSource<T>(client, subject, {
            periodic_update: 0,
            periodic_advertise: 0,
            enable_fetching: true,
            ...options,
        });
        return src;
    }
    // for some reason Firefox does not like symbols as unregister tokens
    // #registration_id = Symbol();
    readonly #registration_id = {};

    #fetch_subscription: Subscription | undefined;
    #periodic_update_timeout_id: number = -1;
    #periodic_advertise_timeout_id: number = -1;

    #current_value = new Map<string, { value: T; last_update: number }>();
    #full_update: Uint8Array | null = null;
    #current_change_id: Uint8Array;

    #build_full_update() {
        if (!this.#full_update) {
            const data = encode(Object.fromEntries(this.#current_value.entries().map(([key, { value }]) => [key, value])));
            this.#full_update = new Uint8Array(data.length + 17);
            this.#full_update[0] = 0x01;
            this.#full_update.set(this.#current_change_id, 1);
            this.#full_update.set(data, 17);
        }
        return this.#full_update;
    }

    #modified() {
        this.#full_update = null;
        crypto.getRandomValues(this.#current_change_id);
    }

    async #run_fetch() {
        this.#fetch_subscription = this.client.subscribe(`%map_source_v2%.${this.subject}`);
        for await (const msg of this.#fetch_subscription) {
            msg.respond(this.#build_full_update());
        }
    }

    #send_partial(content: ValueType) {
        const data = encode(content);
        const message = new Uint8Array(data.length + 17);
        message[0] = 0x02;
        message.set(this.#current_change_id, 1);
        message.set(data, 17);

        this.client.publish(`%map_sink_v2%.${this.subject}`, message);
    }

    #send_single(key: string, value: ValueType) {
        this.#send_partial({
            [key]: value,
        });
    }

    #send_selective_update(filter: (_: [string, { value: ValueType; last_update: number }]) => boolean) {
        const now = performance.now();
        this.#send_partial(Object.fromEntries(
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

    public set(key: string, value: T) {
        let edits = false;
        if (this.#current_value.get(key)?.value !== value) {
            this.#current_value.set(key, { value, last_update: performance.now() });
            edits = true;
        }

        if (edits) {
            this.#modified();
            this.#send_single(key, value);

            this.#periodic_advertise();
        }
    }

    public get(key: string): T | undefined {
        return this.#current_value.get(key)?.value;
    }

    public has(key: string): boolean {
        return this.#current_value.has(key);
    }

    /**
     * Update multiple values at once. This will cause a full update if there is a diff.
     */
    public update(data: Map<string, T>) {
        const now = performance.now();
        const keys = new Set<string>([...data.keys(), ...this.#current_value.keys()]);
        let edits = false;
        for (const key of keys) {
            const data_value = data.get(key);
            const entry = this.#current_value.get(key);

            if (data_value !== entry?.value) {
                if (data_value === undefined) {
                    this.#current_value.delete(key);
                } else {
                    this.#current_value.set(key, { value: data_value, last_update: now });
                }
                edits = true;
            }
        }

        if (edits) {
            this.#modified();
            this.client.publish(`%map_sink_v2%.${this.subject}`, this.#build_full_update());

            for (const [_, entry] of this.#current_value) {
                entry.last_update = now;
            }

            this.#periodic_advertise();
            this.#periodic_update();
        }
    }

    /**
     * overwrite all values with the given data. Causes a full update even without diff.
     */
    public replace(data: Map<string, T>): void {
        const now = performance.now();
        this.#current_value.clear();
        for (const [key, value] of data) {
            if (value !== undefined) {
                this.#current_value.set(key, { value, last_update: now });
            }
        }

        this.#modified();
        this.client.publish(`%map_sink_v2%.${this.subject}`, this.#build_full_update());

        this.#periodic_advertise();
        this.#periodic_update();
    }

    #periodic_update() {
        clearTimeout(this.#periodic_update_timeout_id);
        if (this.options.periodic_update > 0) {
            const weak_this = new WeakRef(this);

            this.#periodic_update_timeout_id = setTimeout(() => {
                const self = weak_this.deref();
                if (!self) return;
                const now = performance.now();
                self.#send_selective_update(([_, { last_update }]) => now - last_update > (self.options.periodic_update));
                self.#periodic_update();
            }, this.options.periodic_update);
        }
    }

    #periodic_advertise() {
        clearTimeout(this.#periodic_advertise_timeout_id);
        if (this.options.periodic_advertise > 0) {
            const weak_this = new WeakRef(this);

            this.#periodic_advertise_timeout_id = setTimeout(() => {
                const self = weak_this.deref();
                if (!self) return;
                const message = new Uint8Array(1 + self.#current_change_id.length);
                message[0] = 0x03;
                message.set(self.#current_change_id, 1);
                self.client.publish(`%map_sink_v2%.${self.subject}`, message);
                self.#periodic_advertise();
            }, this.options.periodic_advertise);
        }
    }

    [Symbol.dispose]() {
        this.#fetch_subscription?.unsubscribe();
        dispose_registry.unregister(this.#registration_id);
        clearTimeout(this.#periodic_update_timeout_id);
        clearTimeout(this.#periodic_advertise_timeout_id);
    }
}
