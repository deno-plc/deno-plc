/**
 * @license GPL-3.0-or-later
 * Deno-PLC HMI
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

import { signal } from "@deno-plc/signals";
import { useEffect } from "preact/hooks";

const counter = signal(0);

export function LoadBar() {
    return (
        <div class={`w-full relative h-0 overflow-visible z-30`}>
            {counter.value > 0 ? <div class={`absolute h-1 bg-lime-500 animate-load rounded-full`}></div> : null}
        </div>
    );
}

export function RequestLoadBar(p: {
    request?: boolean;
}) {
    useEffect(() => {
        if (p.request === false) return;
        counter.value++;
        return () => {
            counter.value--;
        };
    }, [p.request]);
    return null;
}
