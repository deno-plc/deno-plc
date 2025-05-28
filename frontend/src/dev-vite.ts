/**
 * @license GPL-3.0-or-later
 * Deno-PLC HMI
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

import { createServer } from "vite";
import { config } from "./vite.ts";
// import { app } from "../src/server/server.ts";
import { Lock } from "https://deno.land/x/simple_promise_lock@v2.2.1/deno/lock.ts";
import { render } from "preact-render-to-string";
import { StatusCode } from "hono/utils/http-status";
import { DevSSR } from "./dev.ssr.tsx";
import { serveFile } from "@std/http";
import { getPath } from "./material-icons.ssr.ts";
import { Hono } from "hono";
import { configure, getConsoleSink } from "@logtape/logtape";

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
            category: "vite-plugin-deno",
            lowestLevel: "info",
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

const vite_cfg = config({
    env: "browser",
});

const vite_server = createServer(vite_cfg);
vite_server.then((vite) => {
    vite.listen().then(() => {
        console.log("%c[vite] ready", "color: green");
    });
});

const app = new Hono();

app.use((c, next) => {
    c.header("Cross-Origin-Opener-Policy", "same-origin");
    c.header("Cross-Origin-Embedder-Policy", "credentialless");
    return next();
});

app.get("/dev-assets/tailwind-play", async (c) => {
    const play_code = await Deno.readTextFile("./frontend/src/style/play.tailwind.js.bin");
    c.header("Content-Type", "text/javascript");
    return c.body(`${play_code}`);
});

app.get("/dev-assets/material-symbols/:fam", async (c) => {
    const path = await getPath(c.req.param("fam"));
    return serveFile(c.req.raw, path);
});

app.all("/", async (c) => {
    const websocketProtocol = c.req.header("sec-websocket-protocol");
    if (
        c.req.header("Upgrade")?.toLowerCase() === "websocket" &&
        websocketProtocol?.startsWith("vite-")
    ) {
        const { response, socket: downstream } = Deno.upgradeWebSocket(
            c.req.raw,
            {
                protocol: websocketProtocol,
            },
        );

        const upstream = new WebSocket("ws://[::1]:81/", websocketProtocol);

        const upstreamReady = Lock(true);
        const downstreamReady = Lock(true);

        upstream.addEventListener("message", async (ev) => {
            await downstreamReady();
            if (downstream.readyState === WebSocket.OPEN) {
                downstream.send(ev.data);
            }
        });

        upstream.addEventListener("open", () => {
            upstreamReady.unlock();
        });

        upstream.addEventListener("close", () => {
            if (downstream.readyState === WebSocket.OPEN) {
                downstream.close();
            }
        });

        downstream.addEventListener("message", async (ev) => {
            await upstreamReady();
            if (upstream.readyState === WebSocket.OPEN) {
                upstream.send(ev.data);
            }
        });

        downstream.addEventListener("open", () => {
            downstreamReady.unlock();
        });

        downstream.addEventListener("close", () => {
            if (upstream.readyState === WebSocket.OPEN) {
                upstream.close();
            }
        });

        await upstreamReady();

        return response;
    } else {
        return c.redirect("/~home");
    }
});

app.use(async (c) => {
    if (c.req.path.startsWith("/~")) {
        let status: StatusCode = 200;
        const html = `<!DOCTYPE html>${
            render(
                await DevSSR(c.req.path, (error) => {
                    status = error;
                }, "vite"),
            )
        }`;
        return c.html(html, status);
    } else {
        try {
            const req = new URL(c.req.url);
            const res = await fetch(
                new URL(`http://[::1]:81${req.pathname}${req.search}`),
                c.req.raw,
            );

            return res;
        } catch {
            return c.text("HTTP 502 Bad Gateway", 502);
        }
    }
});

function request_handler(req: Request): Promise<Response> | Response {
    return app.fetch(req);
}

let num_listeners = 0;
function onListen() {
    num_listeners++;
    if (num_listeners === 4) {
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
