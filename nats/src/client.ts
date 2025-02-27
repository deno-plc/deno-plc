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
import { useEffect, useRef } from "preact/hooks";
import type { Signal } from "@deno-plc/signals";
import { BlobSource, type BlobSourceOptions } from "./blob.source.ts";
import { type NATS_Status, nats_status as nats_status_signal } from "./state_container.ts";
import { BlobSink, BlobSinkInner, type BlobSinkOptions } from "./blob.sink.ts";
import { MapSink, MapSinkInner, type MapSinkOptions } from "./map.sink.ts";
import { MapSource, type MapSourceOptions } from "./map.source.ts";
import { $pub_crate$_blob_subscriptions, $pub_crate$_constructor, $pub_crate$_inner, $pub_crate$_map_subscriptions } from "./pub_crate.ts";
import { RetryManager, type RetryPolicy } from "./shared.ts";
import type { z } from "zod";
import type { ZodTypeDefWithKind } from "./zod.eq.ts";
import type { ValueType } from "@std/msgpack/encode";

/**
 * A wrapper around the NATS connection that adds some convenience methods for PLC-related tasks. All standard methods are proxied 1:1.
 */
export class NatsClient {
    constructor(
        readonly core: NatsConnection,
        readonly nats_status: Signal<NATS_Status> = nats_status_signal,
        public default_retry_policy: RetryPolicy = RetryManager.default(),
    ) {
    }

    /**
     * Publishes the specified data to the specified subject.
     */
    public publish(subject: string, data: Uint8Array, options?: PublishOptions): void {
        this.core.publish(subject, data, options);
    }

    /**
     * Publishes using the subject of the specified message, specifying the data, headers and reply found in the message if any
     */
    public publishMessage(msg: Msg): void {
        this.core.publishMessage(msg);
    }

    /**
     * Replies using the reply subject of the specified message, specifying the data, headers in the message if any.
     */
    public respondMessage(msg: Msg): void {
        this.core.respondMessage(msg);
    }

    /**
     * Subscribe expresses interest in the specified subject. The subject may have wildcards. Messages are delivered to the
     * SubOpts#callback SubscriptionOptions callback if specified. Otherwise, the subscription is an async iterator for Msg.
     */
    public subscribe(subject: string, opts?: SubscriptionOptions): Subscription {
        return this.core.subscribe(subject, opts);
    }

    /**
     * Publishes a request with specified data in the specified subject expecting a response before RequestOptions#timeout milliseconds.
     * The api returns a Promise that resolves when the first response to the request is received.
     * If there are no responders (a subscription) listening on the request subject, the request will fail as soon as the server processes it.
     */
    request(subject: string, payload?: Payload, opts?: RequestOptions): Promise<Msg> {
        return this.core.request(subject, payload, opts);
    }

    /**
     * Publishes a request expecting multiple responses back. Several strategies to determine when the request should stop gathering responses.
     */
    requestMany(subject: string, payload?: Payload, opts?: Partial<RequestManyOptions>): Promise<AsyncIterable<Msg>> {
        return this.core.requestMany(subject, payload, opts);
    }

    /**
     * @internal
     */
    [$pub_crate$_blob_subscriptions]: Map<string, BlobSinkInner> = new Map();

    /**
     * Transmits the specified byte array to the specified subject.
     */
    blob_source(subject: string, initial: Uint8Array, opt?: BlobSourceOptions): BlobSource {
        return BlobSource[$pub_crate$_constructor](this, subject, initial, opt);
    }

    /**
     * Sinks (receives) a shared byte array from the specified subject.
     */
    blob_sink(subject: string, opt?: BlobSinkOptions): BlobSink {
        let inner: BlobSinkInner;
        if (this[$pub_crate$_blob_subscriptions].has(subject)) {
            inner = this[$pub_crate$_blob_subscriptions].get(subject)!;
        } else {
            inner = BlobSinkInner[$pub_crate$_constructor](this, subject, opt);
            this[$pub_crate$_blob_subscriptions].set(subject, inner);
        }
        return BlobSink[$pub_crate$_constructor](inner);
    }

    /**
     * Sinks (receives) a shared byte array from the specified subject.
     * Compatible with preact/hooks
     */
    useBlobSink(subject: string, opt?: BlobSinkOptions): BlobSink {
        const sink = useRef<BlobSink | null>(null);
        useEffect(() => () => {
            sink.current?.[Symbol.dispose]?.();
        }, []);
        if (sink.current?.[$pub_crate$_inner].subject !== subject) {
            let inner: BlobSinkInner;
            if (this[$pub_crate$_blob_subscriptions].has(subject)) {
                inner = this[$pub_crate$_blob_subscriptions].get(subject)!;
            } else {
                inner = BlobSinkInner[$pub_crate$_constructor](this, subject, opt);
                this[$pub_crate$_blob_subscriptions].set(subject, inner);
            }
            sink.current?.[Symbol.dispose]?.();
            sink.current = BlobSink[$pub_crate$_constructor](inner);
        }
        return sink.current;
    }

    /**
     * @internal
     */
    [$pub_crate$_map_subscriptions]: Map<string, MapSinkInner> = new Map();

    /**
     * Transmits the shared map to the specified subject.
     */
    map_source<Schema extends z.ZodType<unknown, ZodTypeDefWithKind>>(
        subject: string,
        opt: MapSourceOptions & {
            schema: Schema;
        },
    ): MapSource<z.infer<Schema> & ValueType> {
        return MapSource[$pub_crate$_constructor](this, subject, opt);
    }

    /**
     * Same as {@link map_source}, but requires no zod schema.
     */
    map_source_any<T extends ValueType>(subject: string, opt?: MapSourceOptions): MapSource<T> {
        return MapSource[$pub_crate$_constructor](this, subject, opt);
    }

    /**
     * Sinks (receives) a shared map from the specified subject.
     */
    map_sink<Schema extends z.ZodType<unknown, ZodTypeDefWithKind>>(subject: string, opt: MapSinkOptions<Schema>): MapSink<Schema> {
        let inner: MapSinkInner;
        if (this[$pub_crate$_map_subscriptions].has(subject)) {
            inner = this[$pub_crate$_map_subscriptions].get(subject)!;
        } else {
            inner = MapSinkInner[$pub_crate$_constructor](this, subject, opt);
            this[$pub_crate$_map_subscriptions].set(subject, inner);
        }
        return MapSink[$pub_crate$_constructor](inner, opt.schema);
    }

    /**
     * Sinks (receives) a shared map from the specified subject.
     * Compatible with preact/hooks
     * Important: The option should be memoized.
     */
    useMapSink<Schema extends z.ZodType<unknown, ZodTypeDefWithKind>>(subject: string, opt: MapSinkOptions<Schema>): MapSink<Schema> {
        const sink = useRef<MapSink<Schema> | null>(null);
        useEffect(() => () => {
            sink.current?.[Symbol.dispose]?.();
        }, []);

        if (sink.current?.[$pub_crate$_inner].subject !== subject || sink.current?.schema !== opt.schema) {
            let inner: MapSinkInner;
            if (this[$pub_crate$_blob_subscriptions].has(subject)) {
                inner = this[$pub_crate$_map_subscriptions].get(subject)!;
            } else {
                inner = MapSinkInner[$pub_crate$_constructor](this, subject, opt);
                this[$pub_crate$_map_subscriptions].set(subject, inner);
            }
            sink.current?.[Symbol.dispose]?.();
            sink.current = MapSink[$pub_crate$_constructor](inner, opt.schema);
        }
        return sink.current;
    }
}
