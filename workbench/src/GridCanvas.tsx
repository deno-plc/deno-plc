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

import { useContext, useEffect, useRef } from "preact/hooks";
import { GridGeometryContext, GridGeometryInfo } from "./WBLayout.tsx";

export function BgCanvas(p: {
    opacity?: number;
    onPointerDown?: (e: PointerEvent) => void;
}) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const ctx_ref = useRef<CanvasRenderingContext2D | null>(null);
    const geo_raw = useContext(GridGeometryContext);

    const geo_ref = useRef(GridGeometryInfo.null());

    useEffect(() => {
        if (
            geo_raw.cols !== geo_ref.current.cols ||
            geo_raw.rows !== geo_ref.current.rows ||
            geo_raw.col_size !== geo_ref.current.col_size ||
            geo_raw.row_size !== geo_ref.current.row_size ||
            geo_raw.width !== geo_ref.current.width ||
            geo_raw.height !== geo_ref.current.height
        ) {
            geo_ref.current = geo_raw;
            const geo = geo_ref.current;

            if (ctx_ref.current) {
                const ctx = ctx_ref.current;
                ctx.canvas.width = geo.width + 2;
                ctx.canvas.height = geo.height + 1;
                ctx.clearRect(0, 0, geo.width, geo.height);

                ctx.fillStyle = "#fff";

                for (let i = 0; i <= geo.cols; i++) {
                    for (let j = 0; j <= geo.rows; j++) {
                        ctx.fillRect(i * geo.col_size, j * geo.row_size - 5, 1, 10);
                        ctx.fillRect(i * geo.col_size - 5, j * geo.row_size - 0, 10, 1);
                    }
                }
            }
        }
    }, [geo_raw]);

    useEffect(() => {
        if (canvas.current) {
            ctx_ref.current = canvas.current.getContext("2d");
        }
    }, []);

    return (
        <canvas
            class={`absolute size-full transition-opacity`}
            ref={canvas}
            style={{
                opacity: p.opacity ?? 1,
            }}
            onPointerDown={p.onPointerDown}
        />
    );
}
