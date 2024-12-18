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

import { Rect } from "./rect.ts";
import { Vec2 } from "./vec2.ts";

export function contextMenuPosition(area_size: Vec2, base: Rect, min_size: Vec2): Rect {
    const menu_size = new Vec2(Math.min(area_size.x, Math.max(min_size.x, base.w)), Math.min(area_size.y, Math.max(min_size.y, base.h)));

    const overflow = area_size.sub(base.get_base().add(menu_size));

    return Rect.from_base_size(base.get_base().add(new Vec2(Math.min(0, overflow.x), Math.min(0, overflow.y))), menu_size);
}
