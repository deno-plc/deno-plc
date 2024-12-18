# [@Deno-PLC](https://github.com/deno-plc) / [signal-utils](https://jsr.io/@deno-plc/signal-utils)

Small and easy to use utilities for
[Preact Signals](https://preactjs.com/guide/v10/signals)

They simplify usage [in async code](#awaitsignalawaitmatch),
[with Sets and Maps](#setsignalmapsignal) and [as timers](#timersignal)

## Installation

[Use JSR: ![JSR](https://jsr.io/badges/@deno-plc/signal-utils)](https://jsr.io/@deno-plc/signal-utils)

## Usage

More usage examples can be found
[here](https://github.com/deno-plc/signal-utils/tree/main/examples)

### `awaitSignal`/`awaitMatch`

Listen to Signal changes with async/await

```typescript
import { signal } from "@preact/signals-core";
import { awaitSignal } from "@deno-plc/signal-utils/async";

const connected = signal(false);

foo.addEventListener("connected", () => {
    connected.value = true;
});

console.log("connecting ...");
await awaitSignal(connected, true);
console.log("connected!");
```

If you need a more complex comparison you can use `awaitMatch`, which takes a
`(value: T) => boolean` function instead of a fixed value as the second
argument.

Both functions can take a third argument specifying a timeout (in ms) after
which the promise is resolved even if the values don't match. The Promise
resolves with `true` if the values matched and `false` if the timeout was
reached.

### `SetSignal`/`MapSignal`

Both can be used like ordinary Sets/Maps (they even implement the interfaces
provided by the TS DOM lib). Only advanced
[composition functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set#set_composition)
are not supported (they would get extremely complex)

In contrast to ordinary Maps/Sets they track all member changes. Unless
otherwise noted all methods work like `.value` on a signal. Getter functions
like `.has()`, `.get()` or `.size` have mirrors prefixed with `peek_` behaving
like `.peek()` on a signal

```typescript
import { effect } from "@preact/signals-core";
import { SetSignal } from "@deno-plc/signal-utils/set";

const list = new SetSignal();

effect(() => {
    if (list.size > 0) {
        console.log(`The list contains: ${[...list].join(", ")}`);
    } else {
        console.log("The list is empty");
    }
}); // initial run prints: The list is empty

list.add("Apple"); // prints: The list contains: Apple
list.add("Banana"); // prints: The list contains: Apple, Banana
list.clear(); // prints: The list is empty
```

If you really need to access the raw Set/Map use the `unsafe_*` methods.

### `TimerSignal`

A `TimerSignal` is essentially a `boolean` signal that defaults to `false`. It
can be activated, turning it into `true`. After all activations are released
(either the timeout elapsed or it was canceled) it resets to `false`.

```typescript
import { effect } from "@preact/signals-core";
import { TimerSignal } from "@deno-plc/signal-utils/timer";

const timer = new TimerSignal();

effect(() => {
    if (timer.value) {
        console.log("activated");
    } else {
        console.log("released");
    }
}); // initial run prints: released

timer.activate(1000); // prints: activated

// after one second: released
```

### `TimerSignal`.`activate`(`time`?: `number`): `TimerActivation`

Activates the timer for the given time (in ms). Defaults to `Infinity`
(=forever).

### `TimerSignal`.`cancel`(`activation`: `TimerActivation`)

Cancels the given activation

### `TimerSignal`.`clear`()

Cancels all activations

## License (GPL-3.0-or-later)

(C) 2024 Hans Schallmoser

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU General Public License as published by the Free Software
Foundation, either version 3 of the License, or (at your option) any later
version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY
WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with
this program. If not, see https://www.gnu.org/licenses/.
