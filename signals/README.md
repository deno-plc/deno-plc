# [`@deno-plc/signals` ![JSR](https://jsr.io/badges/@deno-plc/signals)](https://jsr.io/@deno-plc/signals)

[Preact Signals](https://preactjs.com/guide/v10/signals/) are extremely useful for building user interfaces and implementing logic functions in Deno.

Unfortunately, they behave strangely when you combine more than one version (which can easily happen). Instead of throwing errors they silently stop
forwarding changes which leads to hard to find errors

`@deno-plc/signals` re-exports everything from `@preact/signals` and ensures only one version is included (it simply uses the version that is
associated with the version of `@deno-plc/signals` that executes first).
