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

import * as preact_signals_current from "npm:@preact/signals@^1.3.0";

const preact_signals_brand = Symbol.for("@deno-plc/signals/brand:preact_signals");

// @ts-ignore globals
if (!self[preact_signals_brand]) {
    // @ts-ignore globals
    self[preact_signals_brand] = preact_signals_current;
}

// @ts-ignore globals
const impl = self[preact_signals_brand] as typeof preact_signals_current;

export const { signal, effect, useComputed, useSignal, useSignalEffect } = impl;

export type { ReadonlySignal, Signal } from "npm:@preact/signals@^1.3.0";
