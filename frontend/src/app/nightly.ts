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

import { get_nightly_provider, init_nightly, LocalStorageNightly } from "@deno-plc/utils/nightly";
import { assert } from "@std/assert/assert";

export function setup_nightly() {
    const provider = new LocalStorageNightly();
    try {
        init_nightly(provider);
        nightly_provider = provider;
    } catch (_) {
        // nightly is already initialized when reloading due to HMR
        const provider = get_nightly_provider();
        assert(provider);
        // LocalStorageNightly will be different
        nightly_provider = provider as LocalStorageNightly;
    }
}

let nightly_provider: LocalStorageNightly | null = null;

export function nightly(): LocalStorageNightly {
    assert(nightly_provider);
    return nightly_provider;
}
