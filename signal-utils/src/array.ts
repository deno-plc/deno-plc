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
 */

/**
 * #################################################################
 * #################################################################
 *
 * Does not work yet, Array is extremely complex and indexed access is
 * very hard to intercept
 *
 * #################################################################
 * #################################################################
 */

// import { signal } from "@preact/signals-core";

/**
 * Use an Array like it was a Preact signal.
 *
 * All builtin Array methods work like `.value`.
 * Methods prefixed `peek_` work like `.peek()`.
 */
// export class ArraySignal<T> implements Array<T> {
//     constructor(...items: T[]) {
//         this.#items = new Array<T>(...items);
//         Object
//     }
//     [n: number]: T;
//     toString(): string {
//         throw new Error("Method not implemented.");
//     }
//     toLocaleString(locales?: string | string[], options?: Intl.NumberFormatOptions & Intl.DateTimeFormatOptions): string {
//         throw new Error("Method not implemented.");
//     }
//     pop(): T | undefined {
//         throw new Error("Method not implemented.");
//     }
//     push(...items: T[]): number {
//         throw new Error("Method not implemented.");
//     }
//     concat(...items: (T | ConcatArray<T>)[] | ConcatArray<T>[]): T[] {
//         throw new Error("Method not implemented.");
//     }
//     join(separator?: string): string {
//         throw new Error("Method not implemented.");
//     }
//     reverse(): T[] {
//         throw new Error("Method not implemented.");
//     }
//     shift(): T | undefined {
//         throw new Error("Method not implemented.");
//     }
//     slice(start?: number, end?: number): T[] {
//         throw new Error("Method not implemented.");
//     }
//     sort(compareFn?: ((a: T, b: T) => number) | undefined): this {
//         throw new Error("Method not implemented.");
//     }
//     splice(start: unknown, deleteCount?: unknown, ...items: T[]): T[] {
//         throw new Error("Method not implemented.");
//     }
//     unshift(...items: T[]): number {
//         throw new Error("Method not implemented.");
//     }
//     indexOf(searchElement: T, fromIndex?: number): number {
//         throw new Error("Method not implemented.");
//     }
//     lastIndexOf(searchElement: T, fromIndex?: number): number {
//         throw new Error("Method not implemented.");
//     }
//     every<S extends T>(predicate: (value: T, index: number, array: T[]) => value is S, thisArg?: any): this is S[] {
//         throw new Error("Method not implemented.");
//     }
//     some(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: any): boolean {
//         throw new Error("Method not implemented.");
//     }
//     map<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): U[] {
//         throw new Error("Method not implemented.");
//     }
//     filter<S extends T>(predicate: (value: T, index: number, array: T[]) => value is S, thisArg?: any): S[] {
//         throw new Error("Method not implemented.");
//     }
//     reduce<U = T>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue?: U): U {
//         throw new Error("Method not implemented.");
//     }
//     reduceRight<U = T>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue?: U): U {
//         throw new Error("Method not implemented.");
//     }
//     find<S extends T>(predicate: (value: T, index: number, obj: T[]) => value is S, thisArg?: any): S | undefined {
//         throw new Error("Method not implemented.");
//     }
//     findIndex(predicate: (value: T, index: number, obj: T[]) => unknown, thisArg?: any): number {
//         throw new Error("Method not implemented.");
//     }
//     fill(value: T, start?: number, end?: number): this {
//         throw new Error("Method not implemented.");
//     }
//     copyWithin(target: number, start: number, end?: number): this {
//         throw new Error("Method not implemented.");
//     }
//     entries(): IterableIterator<[number, T]> {
//         throw new Error("Method not implemented.");
//     }
//     keys(): IterableIterator<number> {
//         throw new Error("Method not implemented.");
//     }
//     includes(searchElement: T, fromIndex?: number): boolean {
//         throw new Error("Method not implemented.");
//     }
//     flatMap<U, This = undefined>(callback: (this: This, value: T, index: number, array: T[]) => U | ReadonlyArray<U>, thisArg?: This | undefined): U[] {
//         throw new Error("Method not implemented.");
//     }
//     flat<A, D extends number = 1>(this: A, depth?: D | undefined): FlatArray<A, D>[] {
//         throw new Error("Method not implemented.");
//     }
//     at(index: number): T | undefined {
//         throw new Error("Method not implemented.");
//     }
//     findLast<S extends T>(predicate: (value: T, index: number, array: T[]) => value is S, thisArg?: any): S | undefined {
//         throw new Error("Method not implemented.");
//     }
//     findLastIndex(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: any): number {
//         throw new Error("Method not implemented.");
//     }
//     toReversed(): T[] {
//         throw new Error("Method not implemented.");
//     }
//     toSorted(compareFn?: ((a: T, b: T) => number) | undefined): T[] {
//         throw new Error("Method not implemented.");
//     }
//     toSpliced(start: number, deleteCount?: number, ...items: T[]): T[] {
//         throw new Error("Method not implemented.");
//     }
//     with(index: number, value: T): T[] {
//         throw new Error("Method not implemented.");
//     }

//     // @ts-ignore deprecated anyway
//     [Symbol.unscopables]: void;

//     readonly #items: Array<T>;
//     readonly #update = signal(0);

//     public get length() {
//         this.#update.value;
//         return this.#items.length;
//     }

//     public get peek_length() {
//         return this.#items.length;
//     }

//     public values(): IterableIterator<T> {
//         this.#update.value;
//         return this.#items.values();
//     }

//     public peek_values(): IterableIterator<T> {
//         return this.#items.values();
//     }

//     // deno-lint-ignore no-explicit-any
//     forEach(callbackfn: (value: T, index: number, array: T[]) => void, thisArg?: any): void {
//         this.#update.value;
//         this.#items.forEach(callbackfn, thisArg);
//     }

//     // deno-lint-ignore no-explicit-any
//     peek_forEach(callbackfn: (value: T, index: number, array: T[]) => void, thisArg?: any): void {
//         this.#items.forEach(callbackfn, thisArg);
//     }

//     [Symbol.iterator](): IterableIterator<T> {
//         this.#update.value;
//         return this.#items[Symbol.iterator]();
//     }
// }
