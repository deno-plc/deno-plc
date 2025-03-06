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
import { $pub_crate$_blob_subscriptions, $pub_crate$_constructor, $pub_crate$_inner } from "./pub_crate.ts";
import { dispose_registry, logger, RetryManager, type RetryPolicy } from "./shared.ts";
import { effect, type Signal, signal } from "@deno-plc/signals";
import { byteEquals } from "@deno-plc/utils/bytes";
import { awaitSignal } from "@deno-plc/signal-utils/async";
import { assert } from "@std/assert/assert";
import type { NatsClient } from "./client.ts";
import { NATS_Status } from "./state_container.ts";
import { wait } from "@deno-plc/utils/wait";

/**
 * Options for subscribing to a blob
 */
export interface BlobSinkOptions {
    /**
     * Enable fetching the latest value on startup. Recommended for values that do not change on a regular basis.
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

export class BlobSinkInner {
    private constructor(readonly client: NatsClient, readonly subject: string, readonly opt: Required<BlobSinkOptions>) {
        this.#retry = new RetryManager(this.opt.retry_policy);
        this.#buffer = new ArrayBuffer(0);
        this.value = signal(new Uint8Array(this.#buffer));

        this.#subscription = client.subscribe(`%blob_sink_v1%.${subject}`);

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

    static [$pub_crate$_constructor](client: NatsClient, subject: string, opt?: BlobSinkOptions): BlobSinkInner {
        return new BlobSinkInner(client, subject, {
            enable_fetching: true,
            source_timeout: 0,
            retry_policy: client.default_retry_policy,
            ...opt,
        });
    }

    #buffer: ArrayBuffer;
    #hash: ArrayBuffer = new ArrayBuffer(0);

    readonly value: Signal<Uint8Array>;
    readonly valid: Signal<boolean> = signal(false);

    #retry: RetryManager;

    #subscription: Subscription;
    #disconnect_handler_release: VoidFunction;
    #timeout: number = -1;

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
                const msg = await this.client.request(`%blob_source_v1%.${this.subject}`);

                this.#buffer = new ArrayBuffer(msg.data.length);
                const view = new Uint8Array(this.#buffer);
                view.set(msg.data);

                this.#hash = await crypto.subtle.digest("SHA-256", view);
                this.value.value = view;
                this.valid.value = true;
            } catch (err) {
                logger.error`error fetching blob ${this.subject}: ${err}`;
            }

            await this.#retry.wait(this.destroy_abort.signal);
        }
    }

    async #run() {
        for await (const msg of this.#subscription) {
            const data = msg.data;

            if (data[0] === 0) {
                // uncompressed update
                this.#buffer = new ArrayBuffer(data.length - 1);
                const view = new Uint8Array(this.#buffer);
                view.set(data.slice(1));

                this.#hash = await crypto.subtle.digest("SHA-256", view);
                this.value.value = view;
                this.valid.value = true;
                this.#reset_timeout();
            } else if (data[0] === 1) {
                // advertisement
                const hash = data.slice(1);
                if (!byteEquals(hash, new Uint8Array(this.#hash))) {
                    logger.info`advertisement hash mismatch, fetching`;
                    this.valid.value = false;
                }
                this.#reset_timeout();
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

    try_dispose() {
        if (this.instances === 0) {
            this.destroyed = true;
            this.client[$pub_crate$_blob_subscriptions].delete(this.subject);
            this.#subscription.unsubscribe();
            clearTimeout(this.#timeout);
            this.destroy_abort.abort();
            this.#disconnect_handler_release();
            this.valid.value = false;

            // release buffers
            this.#buffer = this.#hash = new ArrayBuffer(0);
            this.value.value = new Uint8Array(0);
        }
    }
}

export interface BlobSinkLike extends AsyncDisposable {
    readonly value: Uint8Array;
    peek(): Uint8Array;
    readonly valid: boolean;

    dispose(): Promise<void>;
}

export class BlobSink implements BlobSinkLike {
    private constructor(inner: BlobSinkInner) {
        this[$pub_crate$_inner] = inner;
        assert(!inner.destroyed);
        inner.instances++;
        dispose_registry.register(this, `subscription for ${inner.subject}`, this.#registration_id);
    }
    static [$pub_crate$_constructor](inner: BlobSinkInner): BlobSink {
        return new BlobSink(inner);
    }

    #destroyed = false;
    // for some reason Firefox does not like symbols as unregister tokens
    // #registration_id = Symbol();
    readonly #registration_id = {};
    [$pub_crate$_inner]: BlobSinkInner;

    /**
     * Access the value. This might return a value even if it is marked as invalid. This is @preact/signals hook compatible
     */
    get value(): Uint8Array {
        return this[$pub_crate$_inner].value.value;
    }

    public peek(): Uint8Array {
        return this[$pub_crate$_inner].value.peek();
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

    async dispose() {
        await this[Symbol.asyncDispose]();
    }
}
