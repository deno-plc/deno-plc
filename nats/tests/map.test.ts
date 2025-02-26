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

import { computed } from "@deno-plc/signals";
import { awaitSignal } from "@deno-plc/signal-utils/async";
import { get_test_nats_client } from "./nats.test.common.ts";
import type { MapOptions } from "../src/map.ts";

Deno.test("map transfer.fetch", async () => {
    const { client, dispose } = await get_test_nats_client();

    const opt: MapOptions = {
        enable_fetching: true,
    };

    const src = client.map_source("test", opt);
    src.set("foo", 5);
    src.set("bar", 8);

    const sink = client.map_sink("test", opt);
    const sink_value_matches = computed(() => sink.value.get("foo") === 5 && sink.value.get("bar") === 8);
    await awaitSignal(sink_value_matches, true);
    await dispose();
});

Deno.test("map transfer.update", async () => {
    const { client, dispose } = await get_test_nats_client();

    const opt: MapOptions = {
        enable_fetching: false,
    };

    const src = client.map_source("test", opt);
    const sink = client.map_sink("test", opt);
    src.set("foo", 5);
    src.set("bar", 8);
    const sink_value_matches = computed(() => sink.value.get("foo") === 5 && sink.value.get("bar") === 8);
    await awaitSignal(sink_value_matches, true);
    await dispose();
});
