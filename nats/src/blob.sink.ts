import type { Subscription } from "@nats-io/nats-core";
import { $pub_crate$_blob_subscriptions, $pub_crate$_constructor } from "./pub_crate.ts";
import { logger, subscription_registry } from "./shared.ts";
import { type Signal, signal } from "@deno-plc/signals";
import type { NatsClient } from "../mod.ts";

/**
 * Options for subscribing to a blob
 */
export interface SubscribeBlobOptions {
    _?: void;
}

export class BlobSubscriptionInner {
    constructor(readonly client: NatsClient, readonly subject: string, readonly opt: SubscribeBlobOptions) {
        this.buffer = new ArrayBuffer(1);
        this.value = signal(new Uint8Array(this.buffer));

        this.#subscription = client.subscribe(`%blob_sink_raw%.${subject}`);

        this.#run().then();
    }

    async #run() {
        for await (const msg of this.#subscription) {
            const data = msg.data as Uint8Array;

            // uncompressed update
            if (data[0] === 0) {
                this.buffer = data.buffer;
            } else {
                logger.warn("unsupported compression type", {
                    compression_type: data[0],
                    subject: this.subject,
                });
                continue;
            }

            // trigger signal update
            this.value.value = new Uint8Array(this.buffer, 1);
        }
    }

    #subscription: Subscription;
    buffer: ArrayBuffer;
    readonly value: Signal<Uint8Array>;
    instances = 0;

    try_dispose() {
        if (this.instances === 0) {
            this.client[$pub_crate$_blob_subscriptions].delete(this.subject);
            this.#subscription.unsubscribe();
        }
    }
}

export class BlobSource {
    #reg_id = Symbol();
    private constructor(private readonly inner: BlobSubscriptionInner) {
        this.inner.instances++;
        subscription_registry.register(this, this.inner.subject, this.#reg_id);
    }
    static [$pub_crate$_constructor](inner: BlobSubscriptionInner): BlobSource {
        return new BlobSource(inner);
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

    [Symbol.dispose]() {
        this.inner.instances--;
        subscription_registry.unregister(this.#reg_id);
        // in hooks the old values are dropped first, so we need to wait a bit in case the subscription is used again
        setTimeout(() => {
            this.inner.try_dispose();
        }, 10);
    }

    dispose() {
        this[Symbol.dispose]();
    }
}
