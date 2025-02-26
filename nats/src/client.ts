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

import type { NatsConnection, PublishOptions, Msg, SubscriptionOptions, Subscription, Payload, RequestManyOptions, RequestOptions } from "@nats-io/nats-core";
import { useRef } from "preact/hooks";
import type { Signal } from "@deno-plc/signals";
import { type BlobSourceOptions, BlobSource } from "./blob.source.ts";
import type { NATS_Status } from "./state_container.ts";
import { BlobSinkInner, type BlobSinkOptions, BlobSink } from "./blob.sink.ts";
import { MapSinkInner, type MapSinkOptions, MapSink } from "./map.sink.ts";
import { type MapSourceOptions, MapSource } from "./map.source.ts";
import { $pub_crate$_blob_subscriptions, $pub_crate$_constructor, $pub_crate$_inner, $pub_crate$_map_subscriptions } from "./pub_crate.ts";
import type { RetryPolicy } from "./shared.ts";

/**
 * A wrapper around the NATS connection that adds some convenience methods for PLC-related tasks. All standard methods are proxied 1:1.
 */
export class NatsClient {
    constructor(readonly core: NatsConnection, readonly nats_status: Signal<NATS_Status> = nats_status, public default_retry_policy: RetryPolicy = default_retry_policy) {
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

    [$pub_crate$_blob_subscriptions]: Map<string, BlobSinkInner> = new Map();

    blob_sink(subject: string, opt?: BlobSinkOptions): BlobSink {
        let inner: BlobSinkInner;
        if (this[$pub_crate$_blob_subscriptions].has(subject)) {
            inner = this[$pub_crate$_blob_subscriptions].get(subject)!;
        } else {
            inner = new BlobSinkInner(this, subject, opt ?? {});
            this[$pub_crate$_blob_subscriptions].set(subject, inner);
        }
        return BlobSink[$pub_crate$_constructor](inner);
    }

    blob_source(subject: string, initial: Uint8Array, opt?: BlobSourceOptions): BlobSource {
        return BlobSource[$pub_crate$_constructor](this, subject, initial, opt);
    }

    useBlobSink(subject: string, opt?: BlobSinkOptions): BlobSink {
        const sink = useRef<BlobSink | null>(null);
        if (sink.current?.[$pub_crate$_inner].subject !== subject) {
            sink.current?.[Symbol.dispose]?.();
            let inner: BlobSinkInner;
            if (this[$pub_crate$_blob_subscriptions].has(subject)) {
                inner = this[$pub_crate$_blob_subscriptions].get(subject)!;
            } else {
                inner = new BlobSinkInner(this, subject, opt ?? {});
                this[$pub_crate$_blob_subscriptions].set(subject, inner);
            }
            sink.current = BlobSink[$pub_crate$_constructor](inner);
        }
        return sink.current;
    }

    [$pub_crate$_map_subscriptions]: Map<string, MapSinkInner> = new Map();

    map_sink(subject: string, opt?: MapSinkOptions): MapSink {
        let inner: MapSinkInner;
        if (this[$pub_crate$_map_subscriptions].has(subject)) {
            inner = this[$pub_crate$_map_subscriptions].get(subject)!;
        } else {
            inner = new MapSinkInner(this, subject, opt ?? {});
            this[$pub_crate$_map_subscriptions].set(subject, inner);
        }
        return MapSink[$pub_crate$_constructor](inner);
    }

    map_source(subject: string, opt?: MapSourceOptions): MapSource {
        return MapSource[$pub_crate$_constructor](this, subject, opt);
    }
}
