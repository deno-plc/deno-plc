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

import { signal } from "@deno-plc/signals";
import type { BlobSinkLike, BlobSinkOptions } from "./blob.sink.ts";
import { get_nats, type NatsClient } from "../mod.ts";
import { useEffect, useRef } from "preact/hooks";
import type { MapSinkLike, MapSinkOptions } from "./map.sink.ts";
import { MapSignal } from "@deno-plc/signal-utils/map";
import type { ZodTypeDefWithKind } from "./zod.eq.ts";
import type z from "zod";
import type { ValueType } from "@std/msgpack/encode";

const nats = signal<NatsClient | null>(null);

get_nats().then(($) => nats.value = $);

export class FakeBlobSink implements BlobSinkLike {
    static #value = new Uint8Array();

    get value(): Uint8Array {
        return FakeBlobSink.#value;
    }

    public peek(): Uint8Array {
        return FakeBlobSink.#value;
    }

    get valid(): boolean {
        return false;
    }

    async [Symbol.asyncDispose]() {}
    [Symbol.dispose]() {}
    async dispose() {}
}

/**
 * Sinks (receives) a shared byte array from the specified subject.
 * Compatible with preact/hooks
 */
export function useBlobSink(subject: string, opt?: BlobSinkOptions): BlobSinkLike {
    if (nats.value) {
        return nats.value.useBlobSink(subject, opt);
    } else {
        // placeholder hooks
        useRef(null);
        useEffect(() => {}, [false]);
        return new FakeBlobSink();
    }
}

export class FakeMapSink<T> implements MapSinkLike<T> {
    static #value = new MapSignal<string, never>();

    get value(): MapSignal<string, T> {
        return FakeMapSink.#value;
    }

    get raw_value(): MapSignal<string, ValueType> {
        return FakeMapSink.#value;
    }

    get valid(): boolean {
        return false;
    }

    async [Symbol.asyncDispose]() {}
    [Symbol.dispose]() {}
    async dispose() {}
}

/**
 * Sinks (receives) a shared map from the specified subject.
 * Compatible with preact/hooks
 * Important: The schema should be memoized.
 */
export function useMapSink<Schema extends z.ZodType<unknown, ZodTypeDefWithKind>>(
    subject: string,
    opt: MapSinkOptions<Schema>,
): MapSinkLike<Schema["_output"]> {
    if (nats.value) {
        return nats.value.useMapSink(subject, opt);
    } else {
        // placeholder hooks
        useRef(null);
        useEffect(() => {}, [false]);
        return new FakeMapSink();
    }
}
