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

export class Vec2 {
    constructor(public x: number, public y: number) {}

    public static null(): Vec2 {
        return new Vec2(0, 0);
    }

    public add(v: Vec2): Vec2 {
        return new Vec2(this.x + v.x, this.y + v.y);
    }

    public sub(v: Vec2): Vec2 {
        return new Vec2(this.x - v.x, this.y - v.y);
    }

    public eq(v: Vec2): boolean {
        return this.x === v.x && this.y === v.y;
    }

    public min(v: Vec2): Vec2 {
        return new Vec2(Math.min(this.x, v.x), Math.min(this.y, v.y));
    }

    public max(v: Vec2): Vec2 {
        return new Vec2(Math.max(this.x, v.x), Math.max(this.y, v.y));
    }
}
