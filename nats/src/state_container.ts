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
import { assert } from "@std/assert/assert";

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
if (client_symbol in self) {
    console.error(
        `It looks like you are linking a version of the @deno-plc/nats crate < 0.2.0. Correct initialization of the global semaphores is not guaranteed with these versions.`,
    );
}

const version_symbol = Symbol.for("@deno-plc/nats/semaphore-version-0.2.0");
if (!(version_symbol in self)) {
    Object.defineProperty(self, version_symbol, {
        value: true,
    });
}

export const nats_client = new OnceLock<NatsClient>();

export function save_client(client: NatsClient): void {
    assert(client_init_symbol in self);
    const init_list = self[client_init_symbol] as Array<(client: NatsClient) => void>;
    for (const init of init_list) {
        init(client);
    }
}

const client_init_symbol = Symbol.for("@deno-plc/nats/init");

if (client_init_symbol in self) {
    const init_list = self[client_init_symbol] as Array<(client: NatsClient) => void>;
    init_list.push((client) => {
        nats_client.init(client);
    });
} else {
    Object.defineProperty(self, client_init_symbol, {
        value: [(client: NatsClient) => {
            nats_client.init(client);
        }],
    });
}

const status_symbol = Symbol.for("@deno-plc/nats/status");
export const nats_status: Signal<NATS_Status> = status_symbol in self
    ? (self[status_symbol] as Signal<NATS_Status>)
    : signal(NATS_Status.NotConfigured);

if (!(status_symbol in self)) {
    Object.defineProperty(self, status_symbol, {
        value: nats_status,
    });
}
