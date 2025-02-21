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

export const logger = getLogger(["app", "nats"]);

export const dispose_registry = new FinalizationRegistry<string>((subject) => {
    logger.warn`${subject} was not disposed correctly. This leads to memory leaks.`;
});

/**
 * The fetch strategy for a source.
 */
export enum FetchStrategy {
    /**
     * Don't fetch at all. Only recommended for values that change on a regular basis.
     */
    Off,
    /**
     * Fetch the latest value using NATS Core Request/Response.
     */
    Unicast,
    /**
     * Fetch the latest value using NATS Core Publish/Subscribe. (Response is sent to all subscribers)
     */
    Multicast,
}
