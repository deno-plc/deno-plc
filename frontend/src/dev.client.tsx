/**
 * @license GPL-3.0-or-later
 * Deno-PLC
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

import { clientTerminal } from "@deno-plc/ui/console/client-terminal";
import { configure, getConsoleSink, getLogger } from "@logtape/logtape";

const logger = getLogger(["app"]);

const log_config = configure({
    sinks: {
        console: getConsoleSink(),
        clientTerminal,
    },
    loggers: [
        {
            category: "app",
            lowestLevel: "debug",
            sinks: ["console", "clientTerminal"],
        },
        {
            category: ["app_nc"],
            lowestLevel: "debug",
            sinks: ["clientTerminal"],
        },
        {
            category: ["logtape", "meta"],
            lowestLevel: "debug",
            sinks: ["console", "clientTerminal"],
        },
    ],
    reset: true,
});

import { GlobalPanic } from "@deno-plc/ui/errors";
import { render } from "preact";
import { App } from "./app/App.tsx";
import { init_nats } from "@deno-plc/nats";
import { wsconnect } from "@nats-io/nats-core";
import { setup_nightly } from "./app/nightly.ts";

function Main() {
    return (
        <GlobalPanic>
            <App />
        </GlobalPanic>
    );
}

async function init() {
    await log_config;
    document.body.innerHTML = "";
    setup_nightly();
    render(<Main />, document.body);

    init_nats(wsconnect.bind(self, { servers: ["ws://localhost:1001"] }));
    logger.info`initialized`;
}

addEventListener("load", init);

if (document.readyState === "complete") {
    init();
}
