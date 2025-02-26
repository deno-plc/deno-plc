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
import { Lock } from "@deno-plc/utils/lock";
import { assert } from "@std/assert/assert";
import { NATS_Status } from "./state_container.ts";

export interface BlobSourceOptions {
    /**
     * Sends a full update every `periodic_update` milliseconds.
     */
    readonly periodic_update?: number;

    /**
     * Send a version advertisement every `periodic_advertise` milliseconds.
     */
    readonly periodic_advertise?: number;

    /**
     * allows BlobSinks to fetch the latest value. Recommended for values that do not change on a regular basis.
     */
    readonly enable_fetching?: boolean;
}

export class BlobSource {
    #registration_id = Symbol();
    private constructor(readonly client: NatsClient, readonly subject: string, readonly options: BlobSourceOptions) {
        dispose_registry.register(this, `subscription for ${this.subject}`, this.#registration_id);

        if (this.options.enable_fetching) {
            this.#run_fetch();
        }

        if (this.options.periodic_advertise ?? 0 > 0) {
            assert(this.options.enable_fetching);
        }

        this.#reconnect_release = client.nats_status.subscribe((status) => {
            if (status === NATS_Status.Connected) {
                this.client.publish(`%blob_sink_v1%.${this.subject}`, this.#full_update);
                this.#periodic_update();
                this.#periodic_advertise();
            }
        });
    }

    static [$pub_crate$_constructor](client: NatsClient, subject: string, initial: Uint8Array, options?: BlobSourceOptions): BlobSource {
        if (options?.periodic_advertise ?? 0 > 0) {
            assert(options?.enable_fetching, "periodic_advertise requires enable_fetching");
        }
        const src = new BlobSource(client, subject, options ?? {});
        src.update(initial);
        return src;
    }

    #reconnect_release: VoidFunction;
    #fetch_subscription: Subscription | undefined;

    #periodic_update_timeout_id: number = -1;
    #periodic_advertise_timeout_id: number = -1;

    #last_value: Uint8Array = new Uint8Array(0);
    #hash: Uint8Array = new Uint8Array(0);
    #full_update = new Uint8Array(1);

    #update_lock = new Lock(false);

    async #run_fetch() {
        this.#fetch_subscription = this.client.subscribe(`%blob_source_v1%.${this.subject}`);
        for await (const msg of this.#fetch_subscription) {
            msg.respond(this.#last_value);
        }
    }

    public async update(data: Uint8Array): Promise<void> {
        await this.#update_lock.wait();
        this.#update_lock.lock();

        this.#last_value = data;


        const required_length = data.length + 1;

        if (required_length > this.#full_update.length || data.length > required_length * 1.5 + 20) {
            this.#full_update = new Uint8Array(required_length);
            this.#full_update[0] = 0x00;
        }

        this.#full_update.set(data, 1);

        this.client.publish(`%blob_sink_v1%.${this.subject}`, this.#full_update);

        this.#periodic_update();

        if (this.options.periodic_advertise ?? 0 > 0) {
            this.#hash = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
            this.#periodic_advertise();
        }

        this.#update_lock.unlock();
    }

    #periodic_update() {
        clearTimeout(this.#periodic_update_timeout_id);
        if (this.options.periodic_update ?? 0 > 0) {
            const weak_this = new WeakRef(this);

            this.#periodic_update_timeout_id = setTimeout(() => {
                const self = weak_this.deref();
                if (!self) return;
                self.client.publish(`%blob_sink_v1%.${self.subject}`, self.#full_update);
                self.#periodic_update();
            });
        }
    }

    #periodic_advertise() {
        clearTimeout(this.#periodic_advertise_timeout_id);
        if (this.options.periodic_advertise ?? 0 > 0) {
            const weak_this = new WeakRef(this);

            this.#periodic_advertise_timeout_id = setTimeout(() => {
                const self = weak_this.deref();
                if (!self) return;
                const message = new Uint8Array(1 + self.#hash.length);
                message[0] = 0x01;
                message.set(self.#hash, 1);
                self.client.publish(`%blob_sink_v1%.${self.subject}`, message);
                self.#periodic_advertise();
            });
        }
    }

    [Symbol.dispose]() {
        this.#reconnect_release();
        this.#fetch_subscription?.unsubscribe();
        dispose_registry.unregister(this.#registration_id);
        clearTimeout(this.#periodic_update_timeout_id);
        clearTimeout(this.#periodic_advertise_timeout_id);
    }
}
