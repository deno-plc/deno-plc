# [`@deno-plc/signal-utils` ![JSR](https://jsr.io/badges/@deno-plc/signal-utils)](https://jsr.io/@deno-plc/signal-utils)

Note: This uses the [@deno-plc/signals wrapper](../signals/README.md)

Small and easy to use utilities for [Preact Signals](https://preactjs.com/guide/v10/signals)

They simplify usage [in async code](#awaitsignalawaitmatch), [with Sets and Maps](#setsignalmapsignal) and [as timers](#timersignal)

## Usage

More usage examples can be found [here](https://github.com/deno-plc/deno-plc/tree/main/signal-utils/examples)

### `awaitSignal`/`awaitMatch`

Listen to Signal changes with async/await

```typescript
import { signal } from "@deno-plc/signals";
import { awaitSignal } from "@deno-plc/signal-utils/async";

const connected = signal(false);

foo.addEventListener("connected", () => {
    connected.value = true;
});

console.log("connecting ...");
await awaitSignal(connected, true);
console.log("connected!");
```

If you need a more complex comparison you can use `awaitMatch`, which takes a `(value: T) => boolean` function instead of a fixed value as the second
argument.

Both functions can take a third argument specifying a timeout (in ms) after which the promise is resolved even if the values don't match. The Promise
resolves with `true` if the values matched and `false` if the timeout was reached.

### `SetSignal`/`MapSignal`

Both can be used like ordinary Sets/Maps. Only
[advanced composition functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set#set_composition) are not
supported (they would get extremely complex)

In contrast to ordinary Maps/Sets they track all member changes. Unless otherwise noted all methods work like `.value` on a signal. Getter functions
like `.has()`, `.get()` or `.size` have mirrors prefixed with `peek_` behaving like `.peek()` on a signal

```typescript
import { effect } from "@deno-plc/signals";
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

A `TimerSignal` is essentially a `boolean` signal that defaults to `false`. It can be activated, turning it into `true`. After all activations are
released (either the timeout elapsed or it was canceled) it resets to `false`.

```typescript
import { effect } from "@deno-plc/signals";
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

Activates the timer for the given time (in ms). Defaults to `Infinity` (=forever).

### `TimerSignal`.`cancel`(`activation`: `TimerActivation`)

Cancels the given activation

### `TimerSignal`.`clear`()

Cancels all activations
