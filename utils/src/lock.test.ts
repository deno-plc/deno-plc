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

import { Lock } from "./lock.ts";
import { assertEquals } from "@std/assert/equals";

const wait_time = () =>
    new Promise((resolve) => {
        setTimeout(resolve, 0);
    });

Deno.test("Simple Lock", async () => {
    const lock = new Lock(false);
    let order = 0;

    const assertOrder = (n: number) => {
        assertEquals(order, n);
        order++;
    };

    assertOrder(0);
    await lock.wait(); // should not block
    assertOrder(1);
    lock.lock();
    assertOrder(2);

    (async () => {
        assertOrder(3);
        await lock.wait();
        assertOrder(6);
    })();

    assertOrder(4);
    lock.unlock();
    assertOrder(5); // promises are always run using queueMicrotask
    await wait_time(); // next event loop tick
    assertOrder(7);
    await lock.wait(); // should not block
    assertOrder(8);
});

/**
 * Test the lock ordering when the lock is locked immediately after waiting for it to unlock.
 */
Deno.test("Lock ordering", async () => {
    const lock = new Lock(false);
    let order = 0;

    const assertOrder = (n: number) => {
        assertEquals(order, n);
        order++;
    };

    assertOrder(0);
    await lock.wait(); // should not block
    assertOrder(1);
    lock.lock();
    assertOrder(2);

    (async () => {
        assertOrder(3);
        await lock.wait(); // this is registered first
        assertOrder(7);
        lock.lock(); // immediately lock again
        await wait_time();
        lock.unlock();
        assertOrder(8); // the second block will be run in the next microtask
    })();

    (async () => {
        assertOrder(4);
        await lock.wait(); // this is registered second
        assertOrder(9);
        lock.lock();
        await wait_time();
        lock.unlock();
        assertOrder(10);
    })();

    assertOrder(5);
    lock.unlock();
    assertOrder(6);
    await lock.wait();
    assertOrder(11);
});
