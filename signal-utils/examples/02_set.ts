/**
 * @license GPL-3.0-or-later
 *
 * @Deno-PLC/signal-utils
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

import { effect } from "@deno-plc/signals";
import { SetSignal } from "../src/set.ts";

const list = new SetSignal();

effect(() => {
    if (list.size > 0) {
        console.log(`The list contains: ${[...list].join(", ")}`);
    } else {
        console.log("The list is empty");
    }
}); // first run prints: The list is empty

list.add("Apple"); // prints: The list contains: Apple
list.add("Banana"); // prints: The list contains: Apple, Banana
list.clear(); // prints: The list is empty
