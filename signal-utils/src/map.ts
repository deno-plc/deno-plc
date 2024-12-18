/**
 * @license GPL-3.0-or-later
 *
 * @Deno-PLC/signal-utils
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
 *
 * @module
 */

import { signal } from "@deno-plc/signals";

/**
 * Use a Map like it was a Preact signal.
 *
 * All builtin Map methods work like `.value`.
 * Methods prefixed `peek_` work like `.peek()`
 */
export class MapSignal<K, V> {
    constructor(initial?: Iterable<readonly [K, V]> | null | undefined) {
        this.#inner = new Map(initial);
    }

    readonly #inner;
    readonly #trigger = signal(0);

    /**
     * Unsafely access the raw Map.
     *
     * Using this inside signal hooks will NOT trigger updates.
     *
     * Changes made to the raw Map will not be propagated automatically, you have to call `unsafe_force_update`
     * @unsafe
     */
    public unsafe_get_inner_peek(): Map<K, V> {
        return this.#inner;
    }

    /**
     * Unsafely access the raw Map.
     *
     * Using this inside signal hooks WILL trigger updates.
     *
     * Changes made to the raw Map will not be propagated automatically, you have to call `unsafe_force_update`
     * @unsafe
     */
    public unsafe_get_inner_value(): Map<K, V> {
        this.#trigger.value;
        return this.#inner;
    }

    /**
     * call this immediately after unsafely mutating the inner Map
     * @unsafe
     */
    public unsafe_force_update(): void {
        this.#trigger.value++;
    }

    public get size(): number {
        this.#trigger.value;
        return this.#inner.size;
    }

    public get peek_size(): number {
        return this.#inner.size;
    }

    public entries(): IterableIterator<[K, V]> {
        this.#trigger.value;
        return this.#inner.entries();
    }

    public peek_entries(): IterableIterator<[K, V]> {
        return this.#inner.entries();
    }

    public keys(): IterableIterator<K> {
        this.#trigger.value;
        return this.#inner.keys();
    }

    public peek_keys(): IterableIterator<K> {
        return this.#inner.keys();
    }

    public values(): IterableIterator<V> {
        this.#trigger.value;
        return this.#inner.values();
    }

    public peek_values(): IterableIterator<V> {
        return this.#inner.values();
    }

    forEach(
        callbackfn: (value: V, key: K, map: Map<K, V>) => void,
        thisArg?: unknown,
    ): void {
        this.#trigger.value;
        this.#inner.forEach(callbackfn, thisArg);
    }

    peek_forEach(
        callbackfn: (value: V, key: K, map: Map<K, V>) => void,
        thisArg?: unknown,
    ): void {
        this.#inner.forEach(callbackfn, thisArg);
    }

    [Symbol.iterator](): IterableIterator<[K, V]> {
        this.#trigger.value;
        return this.#inner[Symbol.iterator]();
    }

    get [Symbol.toStringTag](): string {
        this.#trigger.value;
        return this.#inner[Symbol.toStringTag];
    }

    public get(k: K): V | undefined {
        this.#trigger.value;
        return this.#inner.get(k);
    }

    public peek_get(k: K): V | undefined {
        return this.#inner.get(k);
    }

    public has(k: K): boolean {
        this.#trigger.value;
        return this.#inner.has(k);
    }

    public peek_has(k: K): boolean {
        return this.#inner.has(k);
    }

    public set(k: K, v: V): this {
        if (this.#inner.get(k) !== v || v === undefined) {
            this.#inner.set(k, v);
            this.#trigger.value++;
        }
        return this;
    }

    public delete(k: K): boolean {
        const mutated = this.#inner.delete(k);
        if (mutated) {
            this.#trigger.value++;
        }
        return mutated;
    }

    public clear(): this {
        this.#inner.clear();
        this.#trigger.value++;
        return this;
    }
}
