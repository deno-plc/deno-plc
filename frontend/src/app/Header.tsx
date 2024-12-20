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

// import Logo from "../img/Logo.tsx";
import { Ms } from "@deno-plc/ui/icons-ms";
import { isFullscreen, toggleFullscreen } from "@deno-plc/ui/fullscreen";

export function Header(p: {
    title: string;
}) {
    return (
        <div
            class={`flex flex-row items-center border-b border-accent py-2 px-3 gap-3 text-2xl text-stone-300 bg-bg-800 bg-opacity-60`}
        >
            <div
                class={`border border-accent rounded-md size-8 flex flex-row items-center justify-center`}
            >
                <Ms>menu</Ms>
            </div>
            {/* <Logo width={90} height={60} /> */}
            <div>{p.title}</div>
            <div class={`grow h-full flex flex-row items-center justify-end gap-3`}>
                <div
                    class={`flex flex-row items-center justify-center rounded-full bg-amber-500 text-stone-800 size-14 text-[2.5rem]`}
                >
                    <Ms class="pb-1">warning</Ms>
                </div>
                <div
                    class={`flex flex-row items-center justify-center rounded-full bg-bg-600 border border-accent size-14 text-3xl`}
                    onClick={toggleFullscreen}
                >
                    <Ms>{isFullscreen.value ? "fullscreen_exit" : "fullscreen"}</Ms>
                </div>
            </div>
        </div>
    );
}
