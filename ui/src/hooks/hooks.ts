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

import { assert } from "@std/assert/assert";
import { type Inputs, useEffect } from "preact/hooks";

export type AsyncEffectFunction = (cleanup: Promise<void>) => Promise<void>;

export function useAsyncEffect(effect: AsyncEffectFunction, deps: Inputs): void {
    useEffect(() => {
        let cleanup: VoidFunction | undefined;
        const cleanup_promise = new Promise<void>((resolve) => {
            cleanup = resolve;
        });
        effect(cleanup_promise);
        assert(cleanup);
        return cleanup;
    }, deps);
}
