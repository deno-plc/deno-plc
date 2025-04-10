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

/**
 * @returns a promise that resolves after a given time
 */
export function wait(time: number, abort?: AbortSignal): Promise<void> {
    return new Promise<void>((resolve) => {
        let resolved = false;
        const id = setTimeout(() => {
            if (!resolved) {
                resolve();
                resolved = true;
            }
        }, time);
        if (abort) {
            abort.addEventListener("abort", () => {
                clearTimeout(id);
                if (!resolved) {
                    resolve();
                    resolved = true;
                }
            });
        }
    });
}
