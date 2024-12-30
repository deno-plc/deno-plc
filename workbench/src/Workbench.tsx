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

import { Ms } from "@deno-plc/ui/icons-ms";
import { clickedOutsideHandler } from "./ClickedOutside.tsx";
import { MemoryCtxProvider } from "./LayoutMem.tsx";
import {
    $pub_crate$_bottom_bar_items,
    $pub_crate$_main_views,
    $pub_crate$_sidebar_tabs,
    registerSidebarTab,
    useRegistrationUpdate,
} from "./registration.tsx";
import { sidebar_active } from "./uistate.ts";
import { WBLayout } from "./WBLayout.tsx";
import type { ComponentChildren, VNode } from "preact";

export function Workbench(p: {
    notification_aggregator?: ComponentChildren;
}): VNode {
    useRegistrationUpdate();
    const Sidebar_component = $pub_crate$_sidebar_tabs.get(sidebar_active.value)?.component ?? (() => <div>No Tab selected</div>);
    return (
        <MemoryCtxProvider>
            <div class={`size-full absolute`} onClick={clickedOutsideHandler}>
                <div class={`flex flex-col bg-bg-700 size-full`}>
                    <div class={`w-full basis-10 border-b border-accent bg-bg-800 flex flex-row items-stretch`}>
                        <div class={`flex flex-row items-center gap-1 px-2`}>
                            <div class={`px-2 py-1 hover:bg-bg-700 rounded text-md`}>File</div>
                            <div class={`px-2 py-1 hover:bg-bg-700 rounded text-md`}>Edit</div>
                            <div class={`px-2 py-1 hover:bg-bg-700 rounded text-md`}>View</div>
                            <div class={`px-2 py-1 hover:bg-bg-700 rounded text-md`}>Help</div>
                        </div>
                    </div>
                    <div class={`grow flex flex-row items-stretch`}>
                        <div class={`basis-16 bg-bg-800 border-accent border-r flex flex-col items-stretch`}>
                            {[...$pub_crate$_sidebar_tabs.values()].map((tab) => (
                                <div
                                    key={tab.id}
                                    onClick={() => {
                                        if (sidebar_active.value === tab.id) {
                                            sidebar_active.value = "";
                                        } else {
                                            sidebar_active.value = tab.id;
                                        }
                                    }}
                                    class={`w-full basis-16 flex flex-col items-center justify-center text-3xl border-l-2 ${
                                        sidebar_active.value === tab.id
                                            ? "border-brand"
                                            : "border-transparent text-neutral-400 hover:text-neutral-100"
                                    } cursor-pointer`}
                                >
                                    <Ms>{tab.icon}</Ms>
                                </div>
                            ))}
                        </div>
                        <div class={`basis-96 bg-bg-800 border-accent border-r relative ${sidebar_active.value ? "flex" : "hidden"}`}>
                            <Sidebar_component />
                        </div>
                        <div class={`grow relative overflow-hidden`}>
                            <WBLayout />
                        </div>
                    </div>
                    <div class={`w-full basis-10 border-t border-accent bg-bg-800 flex flex-row items-stretch justify-between`}>
                        <div class={`flex flex-row items-stretch justify-start`}></div>
                        <div class={`flex flex-row items-stretch justify-end`}>
                            {[...$pub_crate$_bottom_bar_items.values()].map(($) => {
                                const Component = $.component;
                                return <Component />;
                            })}
                            {/* <div class={`flex flex-row items-center px-2 hover:bg-bg-700`}>NATS: {NATS_Status[nats_status.value]}</div> */}
                        </div>
                    </div>
                </div>
                <div
                    class={`absolute bottom-10 right-0 py-4 pr-4 max-w-full max-h-full w-[26rem] min-h-4 flex flex-col overflow-y-auto overflow-x-hidden pointer-events-none`}
                >
                    {p.notification_aggregator}
                </div>
            </div>
        </MemoryCtxProvider>
    );
}

registerSidebarTab({
    id: "home",
    icon: "house",
    name: "Home",
    component: HomeSidebar,
});

function HomeSidebar() {
    return (
        <div class={`size-full grid grid-cols-2 gap-2`}>
            {[...$pub_crate$_main_views.values()].map((view) => (
                <div class={`flex flex-col items-center justify-center text-xl max-h-28`} draggable>
                    <div class={`text-3xl`}>
                        <Ms>{view.icon}</Ms>
                    </div>
                    <span>{view.name}</span>
                </div>
            ))}
        </div>
    );
}

registerSidebarTab({
    id: "settings",
    icon: "settings",
    name: "Settings",
    component: () => <div>Settings</div>,
});
