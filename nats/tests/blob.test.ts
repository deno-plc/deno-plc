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
import type { BlobOptions } from "../src/blob.ts";

Deno.test("blob transfer.fetch", async () => {
    const { client, dispose } = await get_test_nats_client();

    const opt: BlobOptions = {
        enable_fetching: true,
    };

    const value = new Uint8Array(15);
    crypto.getRandomValues(value);
    const _src = client.blob_source("test", value, opt);
    const sink = client.blob_sink("test", opt);
    const sink_value_matches = computed(() => {
        if (sink.value.length !== value.length) return false;
        for (let i = 0; i < value.length; i++) {
            if (sink.value[i] !== value[i]) return false;
        }
        return true;
    });
    await awaitSignal(sink_value_matches, true);
    await dispose();
});

Deno.test("blob transfer.update", async () => {
    const { client, dispose } = await get_test_nats_client();

    const opt: BlobOptions = {
        enable_fetching: false,
    };

    const value = new Uint8Array(15);
    crypto.getRandomValues(value);
    const src = client.blob_source("test", new Uint8Array(0), opt);
    const sink = client.blob_sink("test", opt);
    const sink_value_matches = computed(() => {
        if (sink.value.length !== value.length) return false;
        for (let i = 0; i < value.length; i++) {
            if (sink.value[i] !== value[i]) return false;
        }
        return true;
    });
    src.update(value);
    await awaitSignal(sink_value_matches, true);
    await dispose();
});
