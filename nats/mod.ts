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
import { logger } from "./src/shared.ts";
import { $pub_crate$_blob_subscriptions, $pub_crate$_constructor } from "./src/pub_crate.ts";
import { BlobSource, BlobSubscriptionInner, type SubscribeBlobOptions } from "./src/blob.sink.ts";

export { NATS_Status, nats_status } from "./state_container.ts";

export function get_nats(): Promise<NatsClient> {
    return nats_client.get();
}

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

    [$pub_crate$_blob_subscriptions]: Map<string, BlobSubscriptionInner> = new Map();

    blob_sink(subject: string, opt: SubscribeBlobOptions): BlobSource {
        let inner: BlobSubscriptionInner;
        if (this[$pub_crate$_blob_subscriptions].has(subject)) {
            inner = this[$pub_crate$_blob_subscriptions].get(subject)!;
        } else {
            inner = new BlobSubscriptionInner(this, subject, opt);
            this[$pub_crate$_blob_subscriptions].set(subject, inner);
        }
        return BlobSource[$pub_crate$_constructor](inner);
    }
}

export { BlobSource } from "./src/blob.sink.ts";
export type { SubscribeBlobOptions } from "./src/blob.sink.ts";
