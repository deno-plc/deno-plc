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

const Uninitialized = Symbol("Uninitialized");
/**
 * Utility for storing global instances
 */
export class OnceLock<T> {
    constructor() {
        this.#pr = new Promise((resolve) => {
            this.#resolve = resolve;
        });
    }
    #value: T | typeof Uninitialized = Uninitialized;
    readonly #pr: Promise<T>;
    #resolve: (value: T) => void = () => {};

    /**
     * Returns true if the OnceLock is initialized
     */
    public get initialized(): boolean {
        return this.#value !== Uninitialized;
    }

    /**
     * @returns the value if it is initialized, otherwise null
     */
    public try_get(): T | null {
        if (this.#value === Uninitialized) {
            return null;
        } else {
            return this.#value;
        }
    }

    /**
     * @returns a Promise that resolves to the value once it is initialized or immediately if it is already initialized
     */
    public get(): Promise<T> {
        if (this.#value === Uninitialized) {
            return this.#pr;
        } else {
            return Promise.resolve(this.#value);
        }
    }

    /**
     * @returns the value if it is initialized, otherwise initializes it with the return value of the given function and returns it
     */
    public get_or_init(init: () => T): T {
        if (this.#value === Uninitialized) {
            const value = init();
            this.#value = value;
            this.#resolve(value);
            return value;
        } else {
            return this.#value;
        }
    }

    /**
     * Initializes the OnceLock with the given value. Throws an error if the OnceLock is already initialized.
     */
    public init(value: T) {
        if (this.#value === Uninitialized) {
            this.#value = value;
            this.#resolve(value);
        } else {
            throw new Error(`OnceLock is already initialized`);
        }
    }
}
