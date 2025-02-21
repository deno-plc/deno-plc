/**
 * @license GPL-3.0-or-later
 * Deno-PLC
 *
 * Copyright (C) 2024 - 2025 Hans Schallmoser
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
import type { NatsClient } from "../mod.ts";
import { $pub_crate$_constructor } from "./pub_crate.ts";
import { dispose_registry } from "./shared.ts";

export interface BlobSourceOptions {
    /**
     * Sends a full update every `periodic_update` milliseconds.
     */
    periodic_update?: number;

    /**
     * allows BlobSinks to fetch the latest value. Recommended for values that do not change on a regular basis.
     */
    enable_fetching?: boolean;
}

export class BlobSource {
    #registration_id = Symbol();
    private constructor(readonly client: NatsClient, readonly subject: string, readonly options: BlobSourceOptions) {
        dispose_registry.register(this, `subscription for ${this.subject}`, this.#registration_id);
        this.#periodic_update();

        if (this.options.enable_fetching) {
            this.#run_fetch();
        }
    }

    #fetch_subscription: Subscription | undefined;

    async #run_fetch() {
        this.#fetch_subscription = this.client.subscribe(`%blob_source_v1%.${this.subject}`);
        for await (const msg of this.#fetch_subscription) {
            msg.respond(this.#last_value);
        }
    }

    periodic_timeout_id: number = -1;

    static [$pub_crate$_constructor](client: NatsClient, subject: string, initial: Uint8Array, options?: BlobSourceOptions): BlobSource {
        const src = new BlobSource(client, subject, options ?? {});
        src.update(initial);
        return src;
    }

    #last_value: Uint8Array = new Uint8Array(0);

    #full_update = new Uint8Array(1);

    public update(data: Uint8Array): void {
        this.#last_value = data;
        if (data.length + 1 > this.#full_update.length || data.length > this.#full_update.length * 2 + 10) {
            this.#full_update = new Uint8Array(data.length + 1);
            this.#full_update[0] = 0;
        }
        this.#full_update.set(data, 1);
        this.client.publish(`%blob_sink_v1%.${this.subject}`, this.#full_update);
        this.#periodic_update();
    }

    #periodic_update() {
        clearTimeout(this.periodic_timeout_id);
        if (this.options.periodic_update ?? 0 > 0) {
            const weak_this = new WeakRef(this);

            this.periodic_timeout_id = setTimeout(() => {
                const self = weak_this.deref();
                if (!self) return;
                self.client.publish(`%blob_sink_v1%.${self.subject}`, self.#full_update);
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
