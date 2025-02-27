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

export const ZodPrimitives = [
    z.ZodFirstPartyTypeKind.ZodString,
    z.ZodFirstPartyTypeKind.ZodNumber,
    z.ZodFirstPartyTypeKind.ZodBigInt,
    z.ZodFirstPartyTypeKind.ZodBoolean,
    z.ZodFirstPartyTypeKind.ZodDate,
    z.ZodFirstPartyTypeKind.ZodUndefined,
    z.ZodFirstPartyTypeKind.ZodNull,
    z.ZodFirstPartyTypeKind.ZodAny,
    z.ZodFirstPartyTypeKind.ZodUnknown,
    z.ZodFirstPartyTypeKind.ZodNever,
    z.ZodFirstPartyTypeKind.ZodVoid,
] as const satisfies z.ZodFirstPartyTypeKind[];
export type ZodPrimitives = typeof ZodPrimitives[number];

export interface ZodTypeDefWithKind<Kind = z.ZodFirstPartyTypeKind> extends z.ZodTypeDef {
    typeName: Kind;
}

export function is_with_kind<Output, Kind extends z.ZodFirstPartyTypeKind = z.ZodFirstPartyTypeKind>(
    value: z.ZodType<Output>,
): value is z.ZodType<Output, ZodTypeDefWithKind<Kind>> {
    if ("typeName" in value._def) {
        return true;
    }
    return false;
}

export function serialize_zod_type<Schema extends z.ZodType<Output, Def>, Def extends ZodTypeDefWithKind<ZodPrimitives>, Output>(
    schema: Schema,
): string;
export function serialize_zod_type<Schema extends z.ZodType<Output, Def>, Def extends ZodTypeDefWithKind, Output>(schema: Schema): string | null;
export function serialize_zod_type<Schema extends z.ZodType<Output, Def>, Def extends ZodTypeDefWithKind, Output>(schema: Schema): string | null {
    const def = schema._def;
    if (ZodPrimitives.find((kind) => kind === def.typeName)) {
        return JSON.stringify(def);
    }
    return null;
}
