/**
 * @license GPL-3.0-or-later
 * Deno-PLC
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

import { GlobalPanic } from "@deno-plc/ui/errors";

const log_config = configure({
    sinks: {
        console: getConsoleSink(),
    },
    loggers: [
        {
            category: "app",
            level: "debug",
            sinks: ["console"],
        },
        {
            category: ["app_nc"],
            level: "debug",
            sinks: [],
        },
        {
            category: ["logtape", "meta"],
            level: "debug",
            sinks: ["console"],
        },
    ],
    reset: true,
});

import { render } from "preact";
import { configure, getConsoleSink } from "@logtape/logtape";
import { App } from "./app/App.tsx";

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
    render(<Main />, document.body);
}

addEventListener("load", init);

if (document.readyState === "complete") {
    init();
}
