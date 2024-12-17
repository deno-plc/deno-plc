# @deno-plc/signals

This package re-exports @preact/signals to prevent version conflicts.

When preact is included in different versions it throws strange errors, but @preact/signals is worse: it doesn't throw any errors, instead it silently
stops propagating changes.
