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

import { core, event } from "@tauri-apps/api";
import { z } from "zod";
import { signal } from "@preact/signals";

const PanicEvent = z.object({
    backtrace: z.string(),
    thread: z.string(),
    file: z.string(),
    line: z.number(),
    col: z.number(),
    message: z.string(),
});

export type PanicEvent = z.infer<typeof PanicEvent>;

export const panics: PanicEvent[] = [];
export const num_panics = signal(0);

export async function fetch_panics() {
    if (!core.isTauri()) {
        return;
    }
    event.emit("win-init");
    for (let offset = 0; true; offset++) {
        const panic = PanicEvent.parse(await core.invoke("get_next_panic", { offset }));
        console.log(panic);
        panics.push(panic);
        num_panics.value = panics.length;
    }
}
