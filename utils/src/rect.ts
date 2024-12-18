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

import { Vec2 } from "./vec2.ts";

export class Rect {
    constructor(readonly x: number, readonly y: number, readonly w: number, readonly h: number) {}

    public static null(): Rect {
        return new Rect(0, 0, 0, 0);
    }

    public to_null(): Rect {
        return new Rect(this.x, this.y, 0, 0);
    }

    public static from_base_size(base: Vec2, size: Vec2): Rect {
        return new Rect(base.x, base.y, size.x, size.y);
    }

    public static from_start_end(start: Vec2, end: Vec2): Rect {
        const x = Math.min(start.x, end.x);
        const y = Math.min(start.y, end.y);
        const w = Math.abs(end.x - start.x);
        const h = Math.abs(end.y - start.y);
        return new Rect(x, y, w, h);
    }

    public fill_end(unit: number = 1): Rect {
        return new Rect(this.x, this.y, this.w + unit, this.h + unit);
    }

    public get_base(): Vec2 {
        return new Vec2(this.x, this.y);
    }

    public get_size(): Vec2 {
        return new Vec2(this.w, this.h);
    }

    public get_end(): Vec2 {
        return new Vec2(this.x + this.w, this.y + this.h);
    }

    public add(v: Vec2): Rect {
        return new Rect(this.x + v.x, this.y + v.y, this.w, this.h);
    }

    public sub(v: Vec2): Rect {
        return new Rect(this.x - v.x, this.y - v.y, this.w, this.h);
    }

    public eq(v: Rect): boolean {
        return this.x === v.x && this.y === v.y && this.w === v.w && this.h === v.h;
    }
}
