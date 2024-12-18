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

import type { StatusCode } from "hono/utils/http-status";
import { type ComponentChildren, createContext, type VNode } from "preact";
import { useContext } from "preact/hooks";

export interface SSRContext {
    ssr: boolean;
    path: string;
    error: (code: StatusCode) => void;
}

const ssr_ctx = createContext<SSRContext>({
    ssr: false,
    path: "",
    error: () => {},
});

export function SSRContext(p: {
    children?: ComponentChildren;
    path: string;
    error: (code: StatusCode) => void;
}): VNode {
    return (
        <ssr_ctx.Provider
            value={{
                ssr: true,
                path: p.path,
                error: p.error,
            }}
        >
            {p.children}
        </ssr_ctx.Provider>
    );
}

export function useSSRContext(): SSRContext {
    return useContext(ssr_ctx);
}

export function SSRBarrier(p: {
    children?: ComponentChildren;
}): VNode | null {
    if (useContext(ssr_ctx).ssr) {
        return null;
    } else {
        return <>{p.children}</>;
    }
}
