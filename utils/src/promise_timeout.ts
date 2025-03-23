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

/**
 * adds a timeout to a promise
 * @returns a promise that resolves to the value of the input promise or the default value if the input promise does not resolve within the timeout
 */
export function promiseTimeout<T, D>(promise: Promise<T>, timeout: number, default_value: D): Promise<T | D> {
    return new Promise((resolve) => {
        let resolved = false;
        promise.then((val) => {
            if (!resolved) {
                resolved = true;
                resolve(val);
            }
        });
        setTimeout(() => {
            if (!resolved) {
                resolved = true;
                resolve(default_value);
            }
        }, timeout);
    });
}
