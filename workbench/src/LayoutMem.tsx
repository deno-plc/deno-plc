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

import { type ComponentChildren, createContext } from "preact";
import { redirect, useLocation } from "@deno-plc/router";
import { useContext, useEffect, useMemo } from "preact/hooks";
import { z } from "zod";
import { type Signal, signal, useSignal } from "@deno-plc/signals";

const MemCtx = createContext<{
    model: LayoutModel | null;
    update: VoidFunction;
    updater: Signal<number>;
}>({ model: null, update: () => {}, updater: signal(0) });

const LayoutModelWindow = z.object({
    type: z.string(),
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
});
export type LayoutModelWindow = z.infer<typeof LayoutModelWindow>;

const LayoutModel = z.object({
    version: z.literal(1),
    windows: z.tuple([z.string(), LayoutModelWindow]).array(),
});
export type LayoutModel = z.infer<typeof LayoutModel>;

function emptyLayout(): LayoutModel {
    return { version: 1, windows: [] };
}

export function MemoryCtxProvider(p: { children: ComponentChildren }) {
    const loc = useLocation();
    const id = loc.substring("/~workbench/".length);
    useEffect(() => {
        if (!id) {
            redirect(`~workbench/${crypto.randomUUID()}`);
        }
    }, [id]);
    const model = useMemo(() => {
        if (id) {
            const str = localStorage.getItem(`layout:${id}`);
            if (str) {
                try {
                    return LayoutModel.parse(JSON.parse(str));
                } catch (e) {
                    console.error(e);
                }
            } else {
                localStorage.setItem(`layout:${id}`, JSON.stringify(emptyLayout()));
                return emptyLayout();
            }
        }
        return null;
    }, [id]);
    const updater = useSignal(0);
    return (
        <MemCtx.Provider
            value={{
                model,
                update: () => {
                    updater.value++;
                    if (id) {
                        localStorage.setItem(`layout:${id}`, JSON.stringify(model));
                    }
                },
                updater,
            }}
        >
            {p.children}
        </MemCtx.Provider>
    );
}

export function useLayoutModel(): [LayoutModel | null, VoidFunction] {
    const ctx = useContext(MemCtx);
    ctx.updater.value;
    return [ctx.model, ctx.update];
}
