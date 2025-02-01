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

import { ComponentChildren } from "preact";
import { useLocation } from "@deno-plc/router";
import { useEffect } from "preact/hooks";
import { getLogger } from "@logtape/logtape";
import { LogPage } from "@deno-plc/ui/console";
import { TestPage } from "./components/TestPage.tsx";
import { EditNightly } from "../../../ui/src/nightly/Nightly.tsx";
import { nightly } from "./nightly.ts";

const logger = getLogger(["app", "router"]);

export function E404() {
    const location = useLocation();
    useEffect(() => {
        logger.warn`404: ${location}`;
    }, [location]);
    return (
        <div
            class={`w-full h-full flex items-center justify-center flex-col text-red-700 bg-bg-800 bg-opacity-50`}
        >
            <div class={`text-[6rem] font-light`}>404</div>
            <div class={`text-xl font-semibold`}>Page Exists</div>
        </div>
    );
}

function DefaultHome() {
    return (
        <div class={`w-full h-full flex items-center flex-col bg-bg-800 bg-opacity-50`}>
            <div class={`flex flex-row items-center gap-6`}>
                <div>
                    {/* <Logo /> */}
                </div>
                <div class={`text-stone-200 text-3xl`}>Deno-PLC HMI</div>
            </div>
            <div class={`flex flex-row flex-wrap max-w-full p-4 basis-auto grow w-full items-start justify-center content-start gap-4`}>
                {["Foo", "Bar", "Baz"].map(($, i) => {
                    return (
                        <div
                            key={i}
                            class={`flex flex-col items-center pt-2 text-xl min-h-32 min-w-28 border border-accent bg-bg-800 bg-opacity-50 rounded-lg`}
                        >
                            {$}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function DenoPLCRouter({ location }: {
    location: string;
}) {
    if (location === "/logs") {
        return <LogPage />;
    }

    if (location === "/nightly") {
        return <EditNightly provider={nightly()} />;
    }

    return <E404></E404>;
}

export function PageRouter(p: {
    children?: ComponentChildren;
}) {
    const location = useLocation().substring("/~".length);

    if (p.children) {
        return <>{p.children}</>;
    }

    if (location === "home") {
        return <DefaultHome />;
    }

    if (location.startsWith("deno-plc")) {
        return <DenoPLCRouter location={location.substring("deno-plc".length)} />;
    }

    if (location.startsWith("dash")) {
        return <TestPage />;
    }

    return <E404></E404>;
}
