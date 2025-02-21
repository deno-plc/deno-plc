/**
 * @license GPL-3.0-or-later
 * Deno-PLC
 *
 * Copyright (C) 2025 Hans Schallmoser
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

import { wsconnect } from "@nats-io/nats-core";
import { NatsClient } from "../mod.ts";
import { fromFileUrl } from "jsr:@std/path";

export async function get_test_nats_client(): Promise<{
    client: NatsClient;
    dispose: () => Promise<void>;
}> {
    const server = new Deno.Command("nats-server", {
        args: ["-c", fromFileUrl(new URL("test.nats.conf", import.meta.url))],
        stdout: "null",
        stderr: "null",
    }).spawn();

    let server_killed = false;

    server.output().catch(() => {
        if (!server_killed) {
            Deno.exit(1);
        }
    });

    const nats = await wsconnect({ servers: ["ws://localhost:1001"] });

    const client = new NatsClient(nats);

    return {
        client,
        dispose: async () => {
            await nats.drain();
            server_killed = true;
            server.kill();
            await server.status;
        },
    };
}
