# @Deno-PLC/deno-plc (WIP)

This is the core monorepo for @Deno-PLC. It is under active development and still a work in progress.

It contains all the necessary building blocks to create a PLC/HMI application.

Unlike most classic browser-based HMIs, this one actively uses modern Web APIs and therefore requires a secure context (self-signed TLS certificates
are sufficient). The whole architecture is microservice-inspired to easily achieve redundancy.

Please note that this software is GPL-licensed! [read why](./docs/why-gpl.md)

## The big picture

@Deno-PLC can be considered a framework for PLC/HMIs. It defines a minimal setup to get the application working and provides many different packages
you can choose from without worrying about compatibility. To achieve this compatibility, it declares some rules on how components connect with each
other.

**NATS** is the backbone: all the different modules of the application connect to a NATS Server, which is responsible for message routing. NATS was
originally built for cloud-native applications, but it is extraordinarily lightweight and scalable. In most setups, we will use only a single NATS
server instance, but you can easily build a redundant cluster. NATS has client libraries for nearly every major language, so you can build the backend
in your favorite language! [Read more about NATS](https://docs.nats.io/)

**Vite** is used to bundle the frontend code.

**Preact** is used to declaratively build the user interface. This programming approach works similarly to how classic PLCs are built. Preact is a
faster and more lightweight alternative to React. [Read more about Preact](https://preactjs.com/)

**Deno** is used as a type checker and server-side runtime. It is a modern alternative to Node.js. [Read more about Deno](https://deno.com/)

## Overview

All packages are published on [JSR](https://jsr.io/@deno-plc) and [crates.io](https://crates.io/)

### Packages

#### `frontend`

This is not a real package. It contains configuration files, a customized development server, and an example app that demonstrates the usage of all
other packages. Use this as a base for your own project (or just copy it).

#### [`@deno-plc/nats` ![JSR](https://jsr.io/badges/@deno-plc/nats)](./nats/README.md)

This is a wrapper around the NATS Core API providing helpers for typical PLC use cases

#### [`@deno-plc/router` ![JSR](https://jsr.io/badges/@deno-plc/router)](./router/README.md)

This package implements a basic path router by providing a `useLocation` hook and `redirect`/`navigate` methods. For convenience, it exports a
`<Link>` component that can be used the same way as `<a>`. Although you could use `react-router` or `preact-router`, this one is extremely lightweight
(~150LOC) and highly flexible.

#### [`@deno-plc/signals` ![JSR](https://jsr.io/badges/@deno-plc/signals)](./signals/README.md)

[Preact Signals](https://preactjs.com/guide/v10/signals/) are extremely useful for building user interfaces and implementing logic functions in Deno.
Unfortunately, they behave strangely when you combine more than one version (which can easily happen). `@deno-plc/signals` re-exports everything from
`@preact/signals` and ensures only one version is included (it simply uses the version that is associated with the version of `@deno-plc/signals` that
runs first).

#### [`@deno-plc/signal-utils` ![JSR](https://jsr.io/badges/@deno-plc/signal-utils)](./signal-utils/README.md)

This package provides many useful utilities for working with more complex signals.

#### [`@deno-plc/ui` ![JSR](https://jsr.io/badges/@deno-plc/ui)](./ui/README.md)

This package contains components that simplify UI development.

#### [`@deno-plc/utils` ![JSR](https://jsr.io/badges/@deno-plc/utils)](./utils/README.md)

This package contains many useful utilities that are used internally.

#### [`@deno-plc/workbench` ![JSR](https://jsr.io/badges/@deno-plc/workbench)](./workbench/README.md)

This package implements a user-customizable UI that is is inspired by VSCode and GrandMA3.

## License

Copyright (C) 2022-2025 Hans Schallmoser

[read more about why is this GPL licensed](./docs/why-gpl.md)

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free
Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details. You should have received a copy of the GNU General Public
License along with this program. If not, see <https://www.gnu.org/licenses/>.
