/**
 * @license GPL-3.0-or-later
 * Deno-PLC
 *
 * Copyright (C) 2024 Hans Schallmoser
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

import type {
    Msg,
    NatsConnection,
    Payload,
    PublishOptions,
    RequestManyOptions,
    RequestOptions,
    Subscription,
    SubscriptionOptions,
} from "@nats-io/nats-core";
import { nats_client, NATS_Status, nats_status } from "./state_container.ts";
import { assert } from "@std/assert/assert";
import { wait } from "@deno-plc/utils/wait";
import { getLogger } from "@logtape/logtape";
import { type Signal, signal } from "../signals/src/mod.ts";

export { NATS_Status, nats_status } from "./state_container.ts";

export function get_nats(): Promise<NatsClient> {
    return nats_client.get();
}

const logger = getLogger(["app", "nats"]);

const $pub_crate$_constructor: unique symbol = Symbol();
const $pub_crate$_subscriptions: unique symbol = Symbol();

const subscription_registry = new FinalizationRegistry((subject) => {
    logger.warn`a subscription for ${subject} was not disposed correctly. This leads to memory leaks.`;
});

/**
 * Handles the initialization of the process global NATS client.
 * @param connect - A function that returns a promise that resolves to a NATS connection. For example `wsconnect.bind(self, { servers: ["ws://localhost:1001"] })`
 */
export async function init_nats(connect: () => Promise<NatsConnection>): Promise<void> {
    logger.info`initializing`;

    if (nats_client.initialized) {
        logger.warn`already initialized, skipping init`;
        return;
    }

    nats_status.value = NATS_Status.Connecting;

    const nc = await connect().catch(async (e) => {
        logger.error`failed to connect: ${e}`;
        nats_status.value = NATS_Status.Error;

        await wait(1000);

        nats_status.value = NATS_Status.Connecting;

        await init_nats(connect);
    });

    if (nats_client.initialized) {
        logger.warn`already initialized, skipping init`;
        return;
    }

    assert(nc);

    logger.info`connected`;

    const client = new NatsClient(nc);

    nats_client.init(client);

    nats_status.value = NATS_Status.Connected;

    (async () => {
        for await (const s of nc.status()) {
            logger.info`status: ${s.type}`;
            // "error" | "disconnect" | "reconnect" | "reconnecting" | "update" | "ldm" | "ping" | "staleConnection" | "slowConsumer" | "forceReconnect"
            switch (s.type) {
                case "disconnect":
                    nats_status.value = NATS_Status.Disconnected;
                    break;
                case "reconnecting":
                    nats_status.value = NATS_Status.Reconnecting;
                    break;
                case "reconnect":
                    nats_status.value = NATS_Status.Connected;
                    break;
                case "error":
                    nats_status.value = NATS_Status.Error;
                    break;
            }
        }
    })().then();
}

/**
 * A wrapper around the NATS connection that adds some convenience methods for PLC-related tasks. All standard methods are proxied 1:1.
 */
export class NatsClient {
    constructor(readonly core: NatsConnection) {
    }

    public publish(subject: string, data: Uint8Array, options?: PublishOptions): void {
        this.core.publish(subject, data, options);
    }

    public publishMessage(msg: Msg): void {
        this.core.publishMessage(msg);
    }

    public respondMessage(msg: Msg): void {
        this.core.respondMessage(msg);
    }

    public subscribe(subject: string, opts?: SubscriptionOptions): Subscription {
        return this.core.subscribe(subject, opts);
    }

    request(subject: string, payload?: Payload, opts?: RequestOptions): Promise<Msg> {
        return this.core.request(subject, payload, opts);
    }

    requestMany(subject: string, payload?: Payload, opts?: Partial<RequestManyOptions>): Promise<AsyncIterable<Msg>> {
        return this.core.requestMany(subject, payload, opts);
    }

    [$pub_crate$_subscriptions]: Map<string, BlobSubscriptionInner> = new Map();

    subscribe_blob(subject: string, opt: SubscribeBlobOptions): BlobSubscription {
        let inner: BlobSubscriptionInner;
        if (this[$pub_crate$_subscriptions].has(subject)) {
            inner = this[$pub_crate$_subscriptions].get(subject)!;
        } else {
            inner = new BlobSubscriptionInner(this, subject, opt);
            this[$pub_crate$_subscriptions].set(subject, inner);
        }
        return BlobSubscription[$pub_crate$_constructor](inner);
    }
}

/**
 * Options for subscribing to a blob
 */
export interface SubscribeBlobOptions {
    /**
     * The maximum size of the blob in bytes, more will be truncated
     * This option is only evaluated on the first subscription to a subject
     */
    max_size: number;

    /** */
    fetch?: boolean;
}

class BlobSubscriptionInner {
    constructor(readonly client: NatsClient, readonly subject: string, readonly opt: SubscribeBlobOptions) {
        this.buffer = new ArrayBuffer(opt.max_size);
        this.value = signal(new Uint8Array(this.buffer));

        this.#subscription = client.subscribe(`%blob_sink_raw%.${subject}`);

        this.#run().then();
    }

    async #run() {
        for await (const msg of this.#subscription) {
            const data = msg.data as Uint8Array;
            const len = Math.min(data.length, this.buffer.byteLength);
            // update data
            new Uint8Array(this.buffer).set(data.subarray(0, len));
            // trigger signal update
            this.value.value = new Uint8Array(this.buffer, 0, len);
        }
    }

    #subscription: Subscription;
    readonly buffer: ArrayBuffer;
    readonly value: Signal<Uint8Array>;
    instances = 0;

    try_dispose() {
        if (this.instances === 0) {
            this.client[$pub_crate$_subscriptions].delete(this.subject);
            this.#subscription.unsubscribe();
        }
    }
}

export class BlobSubscription {
    #reg_id = Symbol();
    private constructor(private readonly inner: BlobSubscriptionInner) {
        this.inner.instances++;
        subscription_registry.register(this, this.inner.subject, this.#reg_id);
    }
    static [$pub_crate$_constructor](inner: BlobSubscriptionInner): BlobSubscription {
        return new BlobSubscription(inner);
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
