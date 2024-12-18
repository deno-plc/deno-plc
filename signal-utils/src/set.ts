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
 * Use a Set like it was a Preact signal.
 *
 * All builtin Set methods work like `.value`.
 * Methods prefixed `peek_` work like `.peek()`.
 *
 * The Set composition methods are all stubs.
 */
export class SetSignal<T> implements Set<T> {
    constructor(initial?: Iterable<T> | null | undefined) {
        this.#inner = new Set(initial);
    }

    readonly #inner;
    readonly #trigger = signal(0);

    /**
     * Unsafely access the raw Set.
     *
     * Using this inside signal hooks will NOT trigger updates.
     *
     * Changes made to the raw Set will not be propagated automatically, you have to call `unsafe_force_update`
     * @unsafe
     */
    public unsafe_get_inner_peek(): Set<T> {
        return this.#inner;
    }

    /**
     * Unsafely access the raw Set.
     *
     * Using this inside signal hooks WILL trigger updates.
     *
     * Changes made to the raw Set will not be propagated automatically, you have to call `unsafe_force_update`
     * @unsafe
     */
    public unsafe_get_inner_value(): Set<T> {
        this.#trigger.value;
        return this.#inner;
    }

    /**
     * call this immediately after unsafely mutating the inner Set
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

    public entries(): IterableIterator<[T, T]> {
        this.#trigger.value;
        return this.#inner.entries();
    }

    public peek_entries(): IterableIterator<[T, T]> {
        return this.#inner.entries();
    }

    public keys(): IterableIterator<T> {
        this.#trigger.value;
        return this.#inner.keys();
    }

    public peek_keys(): IterableIterator<T> {
        return this.#inner.keys();
    }

    public values(): IterableIterator<T> {
        this.#trigger.value;
        return this.#inner.values();
    }

    public peek_values(): IterableIterator<T> {
        return this.#inner.values();
    }

    forEach(
        callbackfn: (value: T, value2: T, set: Set<T>) => void,
        thisArg?: unknown,
    ): void {
        this.#trigger.value;
        this.#inner.forEach(callbackfn, thisArg);
    }

    peek_forEach(
        callbackfn: (value: T, value2: T, set: Set<T>) => void,
        thisArg?: unknown,
    ): void {
        this.#inner.forEach(callbackfn, thisArg);
    }

    [Symbol.iterator](): IterableIterator<T> {
        this.#trigger.value;
        return this.#inner[Symbol.iterator]();
    }

    get [Symbol.toStringTag](): string {
        this.#trigger.value;
        return this.#inner[Symbol.toStringTag];
    }

    public has(value: T): boolean {
        this.#trigger.value;
        return this.#inner.has(value);
    }

    public peek_has(value: T): boolean {
        return this.#inner.has(value);
    }

    public add(value: T): this {
        this.#inner.add(value);
        this.#trigger.value++;
        return this;
    }

    public delete(value: T): boolean {
        const mutated = this.#inner.delete(value);
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

    /**
     * THIS IS A STUB
     */
    union<U>(_other: ReadonlySetLike<U>): Set<T | U> {
        throw new Error("Composition is not supported on SetSignal");
    }
    /**
     * THIS IS A STUB
     */
    intersection<U>(_other: ReadonlySetLike<U>): Set<T & U> {
        throw new Error("Composition is not supported on SetSignal");
    }
    /**
     * THIS IS A STUB
     */
    difference<U>(_other: ReadonlySetLike<U>): Set<T> {
        throw new Error("Composition is not supported on SetSignal");
    }
    /**
     * THIS IS A STUB
     */
    symmetricDifference<U>(_other: ReadonlySetLike<U>): Set<T | U> {
        throw new Error("Composition is not supported on SetSignal");
    }
    /**
     * THIS IS A STUB
     */
    isSubsetOf(_other: ReadonlySetLike<unknown>): boolean {
        throw new Error("Composition is not supported on SetSignal");
    }
    /**
     * THIS IS A STUB
     */
    isSupersetOf(_other: ReadonlySetLike<unknown>): boolean {
        throw new Error("Composition is not supported on SetSignal");
    }
    /**
     * THIS IS A STUB
     */
    isDisjointFrom(_other: ReadonlySetLike<unknown>): boolean {
        throw new Error("Composition is not supported on SetSignal");
    }
}
