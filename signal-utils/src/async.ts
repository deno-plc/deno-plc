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
 *
 * @module
 *
 * Listen to Signal changes with async/await
 *
 * ```typescript
 * import { signal } from "@preact/signals-core";
 * import { awaitSignal } from "@deno-plc/signal-utils/async";
 *
 * const connected = signal(false);
 *
 * foo.addEventListener("connected", () => {
 *     connected.value = true;
 * });
 *
 * console.log("connecting ...");
 * await awaitSignal(connected, true);
 * console.log("connected!");
 * ```
 *
 * If you need a more complex comparison you can use `awaitMatch`, which takes a
 * `(value: T) => boolean` function instead of a fixed value as the second argument.
 *
 * Both functions can take a third argument specifying a timeout (in ms) after
 * which the promise is resolved even if the values don't match.
 * The Promise resolves with `true` if the values matched and `false` if the timeout
 * was reached.
 */

import { effect, type Signal } from "@deno-plc/signals";

/**
 * Waits until the `signal` is `value` or the `timeout` is reached.
 *
 * @returns true if the value matches or false if the timeout is reached.
 *
 * If you need a custom comparison function use {@link awaitMatch}
 */
export function awaitSignal<T>(signal: Signal<T>, value: T): Promise<true>;
export function awaitSignal<T>(signal: Signal<T>, value: T, timeout: number): Promise<boolean>;
export function awaitSignal<T>(
    signal: Signal<T>,
    value: T,
    timeout: number = Infinity,
): Promise<boolean> {
    return new Promise((resolve) => {
        let resolved = false;
        let timeoutID = -1;
        const dispose = effect(() => {
            if (!resolved && signal.value === value) {
                resolve(true);
                dispose?.();
                resolved = true;
                clearTimeout(timeoutID);
            }
        });
        if (timeout < Infinity) {
            timeoutID = setTimeout(() => {
                if (!resolved) {
                    dispose();
                    resolve(false);
                }
            }, timeout);
        }
    });
}

/**
 * Waits until `match` returns true when called with the `signal` value or the `timeout` is reached.
 *
 * @returns true if the value matches or false if the timeout is reached.
 *
 * If you only need a simple comparison use {@link awaitSignal}
 */
export function awaitMatch<T>(
    signal: Signal<T>,
    match: ($: T) => boolean,
): Promise<true>;
export function awaitMatch<T>(
    signal: Signal<T>,
    match: ($: T) => boolean,
    timeout: number,
): Promise<boolean>;
export function awaitMatch<T>(
    signal: Signal<T>,
    match: ($: T) => boolean,
    timeout: number = Infinity,
): Promise<boolean> {
    return new Promise((resolve) => {
        let resolved = false;
        let timeoutID = -1;
        const dispose = effect(() => {
            if (!resolved && match(signal.value)) {
                resolve(true);
                dispose?.();
                resolved = true;
                clearTimeout(timeoutID);
            }
        });
        if (timeout < Infinity) {
            timeoutID = setTimeout(() => {
                if (!resolved) {
                    dispose();
                    resolve(false);
                }
            }, timeout);
        }
    });
}
