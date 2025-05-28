/**
 * @license GPL-3.0-or-later
 * Deno-PLC HMI
 *
 * Copyright (C) 2024 - 2025 Hans Schallmoser
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

import { render } from "preact-render-to-string";
import { StatusCode } from "hono/utils/http-status";
import { DevSSR } from "./dev.ssr.tsx";
import { serveFile } from "@std/http";
import { getPath } from "./material-icons.ssr.ts";
import { Hono } from "hono";
import { configure, getConsoleSink } from "@logtape/logtape";
import { dev_server } from "@deno-plc/build";
import { assertLessOrEqual } from "@std/assert/less-or-equal";
import { join } from "@std/path/join";
import { toFileUrl } from "@std/path/to-file-url";

await configure({
    sinks: {
        console: getConsoleSink(),
    },
    loggers: [
        {
            category: "app",
            lowestLevel: "debug",
            sinks: ["console"],
        },
        {
            category: ["logtape", "meta"],
            lowestLevel: "warning",
            sinks: ["console"],
        },
    ],
    reset: true,
});

const app = new Hono();

app.get("/dev-assets/tailwind-play", async (c) => {
    const play_code = await Deno.readTextFile("./frontend/src/style/play.tailwind.js.bin");
    c.header("Content-Type", "text/javascript");
    return c.body(`${play_code}`);
});

app.get("/dev-assets/material-symbols/:fam", async (c) => {
    const path = await getPath(c.req.param("fam"));
    return serveFile(c.req.raw, path);
});

app.get("/@module/filesink.node.ts", (c) => {
    return c.text("", 200, {
        "Content-Type": "text/javascript;charset=UTF-8",
        "Cache-Control": "no-store",
    });
});

// @cspell:disable-next-line
app.get("/@module/node%3Autil", (c) => {
    return c.redirect("/@npm/util/0.12.5");
});

app.use(async (c, next) => {
    if (c.req.path.startsWith("/~")) {
        let status: StatusCode = 200;
        const html = `<!DOCTYPE html>${
            render(
                await DevSSR(c.req.path, (error) => {
                    status = error;
                }, "dplc"),
            )
        }`;
        return c.html(html, status);
    } else {
        return next();
    }
});

app.get("/", (c) => {
    return c.redirect("/~dash");
});

app.route(
    "/",
    dev_server({
        root_module: toFileUrl(join(Deno.cwd(), "frontend/src", "root.ts")),
        run_graph_server: false,
        // dev_use_cargo: true,
        // graph_server_port: 3000,
        cdn: [
            "@xterm/xterm",
            "@xterm/addon-fit",
            "util",
        ],
    }) as unknown as Hono,
);

function request_handler(req: Request): Promise<Response> | Response {
    return app.fetch(req);
}

let num_listeners = 0;
const NUM_LISTENERS = 2;
function onListen() {
    num_listeners++;
    assertLessOrEqual(num_listeners, NUM_LISTENERS);

    if (num_listeners === NUM_LISTENERS) {
        console.log("%c[dev server] started", "color: green");
    }
}

Deno.serve({
    port: 80,
    hostname: "::",
    onListen,
}, request_handler);

Deno.serve({
    port: 80,
    hostname: "0.0.0.0",
    onListen,
}, request_handler);

// const [cert, key] = await Promise.all([
//     Deno.readTextFile("./cert/cert.pem"),
//     Deno.readTextFile("./cert/key.pem"),
// ]);
// Deno.serve({
//     hostname: "::",
//     port: 443,
//     cert,
//     key,
//     onListen,
// }, request_handler);

// Deno.serve({
//     hostname: "0.0.0.0",
//     port: 443,
//     cert,
//     key,
//     onListen,
// }, request_handler);
