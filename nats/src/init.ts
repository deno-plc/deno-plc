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

import { assert } from "@std/assert/assert";
import { nats_client, NATS_Status, nats_status } from "./state_container.ts";
import { logger } from "./shared.ts";
import { NatsClient } from "./client.ts";
import type { NatsConnection } from "@nats-io/nats-core";
import { wait } from "@deno-plc/utils/wait";

/**
 * Handles the initialization of the process global NATS client.
 * @param connect - A function that returns a promise that resolves to a NATS connection. For example `wsconnect.bind(self, { servers: ["ws://localhost:1001"] })`
 */
export async function init_nats(connect: () => Promise<NatsConnection>): Promise<void> {
    logger.info`initializing`;

    if (nats_client.initialized) {
        logger.warn`already initialized, skipping init`;
        return;
    }

    nats_status.value = NATS_Status.Connecting;

    const nc = await connect().catch(async (e) => {
        logger.error`failed to connect: ${e}`;
        nats_status.value = NATS_Status.Error;

        await wait(1000);

        nats_status.value = NATS_Status.Connecting;

        await init_nats(connect);
    });

    if (nats_client.initialized) {
        logger.warn`already initialized, skipping init`;
        return;
    }

    assert(nc);

    logger.info`connected`;

    for (const [key, value] of Object.entries(nc.info!)) {
        logger.debug`server ${key}: ${value}`;
    }

    const client = new NatsClient(nc, nats_status);

    nats_client.init(client);

    nats_status.value = NATS_Status.Connected;

    (async () => {
        for await (const s of nc.status()) {
            // "error" | "disconnect" | "reconnect" | "reconnecting" | "update" | "ldm" | "ping" | "staleConnection" | "slowConsumer" | "forceReconnect"
            if (s.type !== "ping") {
                logger.info`status: ${s.type}`;
            }
            switch (s.type) {
                case "disconnect":
                    nats_status.value = NATS_Status.Disconnected;
                    break;
                case "reconnecting":
                    nats_status.value = NATS_Status.Reconnecting;
                    break;
                case "reconnect":
                    nats_status.value = NATS_Status.Connected;
                    break;
                case "error":
                    nats_status.value = NATS_Status.Error;
                    break;
            }
        }
    })().then();
}
