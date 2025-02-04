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
import { $pub_crate$_blob_subscriptions, $pub_crate$_constructor } from "./pub_crate.ts";
import { dispose_registry, logger } from "./shared.ts";
import { type Signal, signal } from "@deno-plc/signals";
import type { NatsClient } from "../mod.ts";

/**
 * Options for subscribing to a blob
 */
export interface BlobSinkOptions {
    /**
     * Enable fetching the latest value on startup. Recommended for values that do not change on a regular basis.
     */
    enable_fetching?: boolean;
}

export class BlobSinkInner {
    constructor(readonly client: NatsClient, readonly subject: string, readonly opt: BlobSinkOptions) {
        this.buffer = new ArrayBuffer(0);
        this.value = signal(new Uint8Array(this.buffer));

        this.#subscription = client.subscribe(`%blob_sink_v1%.${subject}`);

        this.#run().then();

        if (opt.enable_fetching) {
            client.request(`%blob_source_v1%.${subject}`).then((msg) => {
                if (this.buffer.byteLength === 0) {
                    this.buffer = new ArrayBuffer(msg.data.length);

                    const view = new Uint8Array(this.buffer);
                    view.set(msg.data);

                    this.value.value = view;
                    this.valid.value = true;
                }
            });
        }
    }

    async #run() {
        for await (const msg of this.#subscription) {
            const data = msg.data;

            // uncompressed update
            if (data[0] === 0) {
                this.buffer = new ArrayBuffer(data.length - 1);
                const view = new Uint8Array(this.buffer);
                view.set(data.slice(1));
                this.value.value = view;
                this.valid.value = true;
            } else {
                logger.warn("unsupported compression type", {
                    compression_type: data[0],
                    subject: this.subject,
                });
                this.value.value = new Uint8Array(0);
                this.valid.value = false;
                continue;
            }
        }
    }

    #subscription: Subscription;
    buffer: ArrayBuffer;
    readonly value: Signal<Uint8Array>;
    readonly valid: Signal<boolean> = signal(false);
    instances = 0;

    try_dispose() {
        if (this.instances === 0) {
            this.client[$pub_crate$_blob_subscriptions].delete(this.subject);
            this.#subscription.unsubscribe();
        }
    }
}

export class BlobSink {
    #registration_id = Symbol();
    private constructor(private readonly inner: BlobSinkInner) {
        this.inner.instances++;
        dispose_registry.register(this, `subscription for ${this.inner.subject}`, this.#registration_id);
    }
    static [$pub_crate$_constructor](inner: BlobSinkInner): BlobSink {
        return new BlobSink(inner);
    }

    /**
     * Access the value. This is @preact/signals hook compatible
     */
    get value(): Uint8Array {
        return this.inner.value.value;
    }

    public peek(): Uint8Array {
        return this.inner.value.peek();
    }

    /**
     * Access the validity. This is @preact/signals hook compatible
     */
    get valid(): boolean {
        return this.inner.valid.value;
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
