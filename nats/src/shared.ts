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

import { getLogger } from "@logtape/logtape";
import { wait } from "@deno-plc/utils/wait";

export const logger = getLogger(["app", "nats"]);

export const dispose_registry = new FinalizationRegistry<string>((subject) => {
    logger.warn`${subject} was not disposed correctly. This leads to memory leaks.`;
});

export interface RetryPolicy {
    /**
     * Minimum delay
     */
    min_delay: number;

    /**
     * Maximum delay
     */
    max_delay: number;

    /**
     * Factor to increase the delay
     */
    factor: number;

    /**
     * jitter factor (0=no jitter, 1=delay between min_delay and max_delay)
     */
    jitter: number;
}

export const default_retry_policy: RetryPolicy = {
    min_delay: 100,
    max_delay: 20_000,
    factor: 1.5,
    jitter: 0.5,
};

export class RetryManager {
    constructor(readonly policy: RetryPolicy) {
        this.#delay = policy.min_delay;
    }

    #delay: number;

    public async wait(abort?: AbortSignal) {
        this.#delay = Math.max(
            Math.min(this.#delay * this.policy.factor * (1 + (Math.random() * 2 - 1) * this.policy.jitter), this.policy.max_delay),
            this.policy.min_delay,
        );

        await wait(this.#delay, abort);
    }

    public reset() {
        this.#delay = this.policy.min_delay;
    }

    static default(): RetryPolicy {
        return default_retry_policy;
    }
}
