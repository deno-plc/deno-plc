/**
 * @license GPL-3.0-or-later
 * Deno-PLC
 *
 * Copyright (C) 2022-2025 Hans Schallmoser
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

export class Lock {
    public constructor(initial_locked: boolean) {
        this.#locked = initial_locked;
    }
    #locked: boolean;
    #queue: (() => void)[] = [];

    public lock(lock: boolean = true) {
        if (lock) {
            this.#locked = true;
        } else {
            this.unlock();
        }
    }

    public unlock() {
        this.#locked = false;
        this.#resume();
    }

    #resume() {
        const next = this.#queue.shift();
        if (next) {
            next();
            queueMicrotask(() => {
                if (!this.#locked) {
                    this.#resume();
                }
            });
        }
    }

    public wait(): Promise<void> {
        return new Promise((resolve) => {
            if (this.#locked || this.#queue.length > 0) {
                this.#queue.push(resolve);
            } else {
                resolve();
            }
        });
    }

    public get locked(): boolean {
        return this.#locked;
    }

    public set locked(locked: boolean) {
        this.lock(locked);
    }
}
