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

import { nats_client } from "./src/state_container.ts";
import type { NatsClient } from "./src/client.ts";

export function get_nats(): Promise<NatsClient> {
    return nats_client.get();
}

export { NATS_Status, nats_status } from "./src/state_container.ts";
export { NatsClient } from "./src/client.ts";
export { init_nats } from "./src/init.ts";

export type { BlobSink, BlobSinkOptions, BlobSinkLike } from "./src/blob.sink.ts";
export type { BlobSource, BlobSourceOptions } from "./src/blob.source.ts";
export type { BlobOptions } from "./src/blob.ts";
export type { MapSource, MapSourceOptions } from "./src/map.source.ts";
export type { MapSink, MapSinkOptions, MapSinkLike } from "./src/map.sink.ts";
export { useMapSink, useBlobSink, FakeBlobSink, FakeMapSink } from "./src/hooks.ts";
