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
 *
 * A `TimerSignal` is essentially a `boolean` signal that defaults to
 * `false`. It can be activated, turning it into `true`. After all
 * activations are released (either the timeout elapsed or it was
 * canceled) it resets to `false`.
 */

import { type ReadonlySignal, signal } from "@deno-plc/signals";
import type { FastBrand } from "@coderspirit/nominal";

/**
 * This is a handle for a {@link TimerSignal} Activation
 *
 * Returned by {@link TimerSignal.activate}
 *
 * Can be passed to {@link TimerSignal.cancel}
 */
export type TimerActivation = FastBrand<symbol, "TimerActivation">;

type Timeout = FastBrand<number | undefined, "Timeout">;

/**
 * A `TimerSignal` is essentially a `boolean` signal that defaults to `false`.
 * It can be activated, turning it into `true`. After all activations are
 * released (either the timeout elapsed or it was canceled) it resets to `false`.
 */
export class TimerSignal implements ReadonlySignal<boolean> {
    constructor() {
        this.#render();
    }

    #value = signal(false);
    #activations = new Map<TimerActivation, Timeout>();

    /**
     * active the timer for the specified time or forever (`Infinity`)
     * @returns The return value can be passed to {@link cancel} to stop the activation
     */
    public activate(time = Infinity): TimerActivation {
        const activation = Symbol() as TimerActivation;

        const timeout = (time !== Infinity
            ? setTimeout(() => {
                this.#activations.delete(activation);
                this.#render();
            }, time)
            : undefined) as Timeout;

        this.#activations.set(activation, timeout);
        this.#render();

        return activation;
    }

    /**
     * cancel the given activation
     */
    public cancel(activation: TimerActivation): void {
        clearTimeout(this.#activations.get(activation));
        this.#activations.delete(activation);
        this.#render();
    }

    /**
     * cancel all activations / reset the signal to its default state
     */
    public clear(): void {
        for (const [, to] of this.#activations) {
            clearTimeout(to);
        }
        this.#activations.clear();
        this.#render();
    }

    #render() {
        this.#value.value = this.peek();
    }

    public peek(): boolean {
        return this.#activations.size > 0;
    }

    get value(): boolean {
        return this.#value.value;
    }

    subscribe(fn: (value: boolean) => void): () => void {
        return this.#value.subscribe(fn);
    }

    valueOf(): boolean {
        return this.#value.valueOf();
    }

    toString(): string {
        return this.#value.toString();
    }

    toJSON(): boolean {
        return this.#value.toJSON();
    }

    get brand(): ReadonlySignal<boolean>["brand"] {
        return this.#value.brand;
    }
}
