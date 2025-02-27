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

import { OnceLock } from "@deno-plc/utils/once_lock";
import { type Signal, signal } from "@deno-plc/signals";
import type { NatsClient } from "../mod.ts";

/**
 * #[non_exhaustive]
 */
export enum NATS_Status {
    NotConfigured = "NotConfigured",
    Connecting = "Connecting",
    Connected = "Connected",
    Disconnected = "Disconnected",
    Reconnecting = "Reconnecting",
    Error = "Error",
}

const client_symbol = Symbol.for("NATS_Client");
const status_symbol = Symbol.for("NATS_Status");

export const nats_client = new OnceLock<NatsClient>();
export const nats_status: Signal<NATS_Status> = status_symbol in self
    ? (self[status_symbol] as Signal<NATS_Status>)
    : signal(NATS_Status.NotConfigured);

if (client_symbol in self) {
    const pr = self[client_symbol] as Promise<NatsClient>;
    pr.then((client) => {
        nats_client.get_or_init(() => client);
    });
} else {
    Object.defineProperty(self, client_symbol, {
        value: (async () => {
            await nats_client.get();
        })(),
    });
}

if (!(status_symbol in self)) {
    Object.defineProperty(self, status_symbol, {
        value: nats_status,
    });
}
