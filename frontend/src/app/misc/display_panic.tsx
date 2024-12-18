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

import { Bsod, BsodTerminal } from "./Bsod.tsx";
import { useState } from "preact/hooks";
import { panics } from "./fetch_panic.tsx";

export function PanicDisplay() {
    const [panic_id] = useState(0);
    const panic = panics[panic_id];
    return (
        <Bsod errorcode={`ERR_THREAD_PANIC #${panic_id}`}>
            <p>
                Thread <code>{panic.thread}</code> panicked at <code>{panic.file}:{panic.line}:{panic.col}</code>
            </p>
            <p class={`my-4`}>
                <code>
                    {panic.message}
                </code>
            </p>
            <p class={`my-4  max-w-full`}>
                <BsodTerminal>{panic.backtrace}</BsodTerminal>
            </p>
        </Bsod>
    );
}
