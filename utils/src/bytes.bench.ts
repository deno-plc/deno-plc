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

import { byteEquals, byteEqualsU32 } from "./bytes.ts";

/**
 * Just for benching, U64 is 4x slower than U32 due to bigint
 */
function byteEqualsU64(a: BigUint64Array, b: BigUint64Array): boolean {
    if (a.length !== b.length) {
        return false;
    }

    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }

    return true;
}


const diff: [ArrayBuffer, ArrayBuffer][] = [];
const same: [ArrayBuffer, ArrayBuffer][] = [];

const len = 200;
const num = 1000;

for (let i = 0; i < num; i++) {
    const a = new Uint8Array(len);
    const b = new Uint8Array(len);
    const c = new Uint8Array(len);

    crypto.getRandomValues(a);
    crypto.getRandomValues(b);
    c.set(a);

    diff.push([a.buffer, b.buffer]);
    same.push([a.buffer, c.buffer]);
}

Deno.bench({
    name: "byteEquals-equal",
    group: "byteEquals-equal",
}, () => {
    for (const [a, b] of same) {
        const res = byteEquals(new Uint8Array(a), new Uint8Array(b));
        assert(res);
    }
});

Deno.bench({
    name: "byteEquals-unequal",
    group: "byteEquals-unequal",
}, () => {
    for (const [a, b] of diff) {
        const res = byteEquals(new Uint8Array(a), new Uint8Array(b));
        assert(!res);
    }
});

Deno.bench({
    name: "byteEqualsU32-equal",
    group: "byteEquals-equal",
}, () => {
    for (const [a, b] of same) {
        const res = byteEqualsU32(new Uint32Array(a), new Uint32Array(b));
        assert(res);
    }
});

Deno.bench({
    name: "byteEqualsU32-unequal",
    group: "byteEquals-unequal",
}, () => {
    for (const [a, b] of diff) {
        const res = byteEqualsU32(new Uint32Array(a), new Uint32Array(b));
        assert(!res);
    }
});

Deno.bench({
    name: "byteEqualsU64-equal",
    group: "byteEquals-equal",
}, () => {
    for (const [a, b] of same) {
        const res = byteEqualsU64(new BigUint64Array(a), new BigUint64Array(b));
        assert(res);
    }
});

Deno.bench({
    name: "byteEqualsU64-unequal",
    group: "byteEquals-unequal",
}, () => {
    for (const [a, b] of diff) {
        const res = byteEqualsU64(new BigUint64Array(a), new BigUint64Array(b));
        assert(!res);
    }
});

function assert(res: boolean) {
    if (!res) {
        throw new Error("assertion failed");
    }
}
