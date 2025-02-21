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

import { Header } from "./Header.tsx";
import { PageRouter } from "./router.tsx";
import { Nav } from "./Nav.tsx";
import { ComponentChildren } from "preact";
import { NotificationAggregator } from "./NotificationAggregator.tsx";
import { LoadBar } from "./components/LoadBar.tsx";
import { useLocation } from "@deno-plc/router";
import { Workbench } from "@deno-plc/workbench";

export function App(p: {
    children?: ComponentChildren;
}) {
    const location = useLocation().substring("/~".length);

    if (location.toLowerCase().startsWith("workbench")) {
        return <Workbench notification_aggregator={<NotificationAggregator />} />;
    }
    return (
        <div class={`size-full bg-no-repeat absolute`} id="app-main">
            <div
                class={`size-full flex flex-col items-stretch relative overflow-hidden backdrop-blur-[10vh] contrast-more:bg-black forced-colors:bg-black contrast-more:backdrop-blur-none`}
            >
                <LoadBar />
                <Header title="Deno-PLC HMI" />
                <div class={`grow flex flex-row relative overflow-hidden`}>
                    <Nav />
                    <div class={`grow relative overflow-hidden`}>
                        <PageRouter>{p.children}</PageRouter>
                    </div>

                    <div
                        class={`absolute bottom-0 right-0 py-4 pr-4 max-w-full max-h-full w-[26rem] min-h-4 flex flex-col overflow-y-auto overflow-x-hidden pointer-events-none`}
                    >
                        <NotificationAggregator />
                    </div>
                </div>
            </div>
        </div>
    );
}
