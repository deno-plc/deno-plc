/**
 * @license GPL-3.0-or-later
 * Deno-PLC
 *
 * Copyright (C) 2025 Hans Schallmoser
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

import { z } from "zod";
import { serialize_zod_type } from "../src/zod.eq.ts";
import { assertEquals, assertNotEquals } from "@std/assert";
import { assert } from "@std/assert/assert";

Deno.test("zodSerialize primitive", () => {
    const types = [
        () => z.string(),
        () => z.string().uuid(),
        () => z.number(),
    ];

    for (const a_factory of types) {
        for (const b_factory of types) {
            const a = a_factory();
            const b = b_factory();
            const a_serialized = serialize_zod_type(a);
            const b_serialized = serialize_zod_type(b);
            assert(a_serialized !== null);
            assert(b_serialized !== null);
            if (a_factory === b_factory) {
                assertEquals(a_serialized, b_serialized);
            } else {
                assertNotEquals(a_serialized, b_serialized);
            }
        }
    }
});

Deno.test("zodSerialize complex", () => {
    const types = [
        z.array(z.string()),
        z.object({
            a: z.string(),
            b: z.number(),
        }),
        z.union([z.string(), z.number()]),
    ];
    for (const t of types) {
        const serialized = serialize_zod_type(t);
        assert(serialized === null);
    }
});
