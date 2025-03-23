# [`@deno-plc/router` ![JSR](https://jsr.io/badges/@deno-plc/router)](https://jsr.io/@deno-plc/router)

This package implements a basic path router by providing a `useLocation` hook and `redirect`/`navigate` methods. For convenience, it exports a
`<Link>` component that can be used the same way as `<a>`. Although you could use `react-router` or `preact-router`, this one is extremely lightweight
(~150LOC) and highly flexible.
