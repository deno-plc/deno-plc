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

import type { JSX } from "preact";
import { signal } from "@deno-plc/signals";

const registration_update = signal(0);

export function useRegistrationUpdate() {
    registration_update.value;
}

export interface SidebarTab {
    id: string;
    icon: string;
    name: string;
    component: () => JSX.Element;
}

export const $pub_crate$_sidebar_tabs = new Map<string, SidebarTab>();

export function registerSidebarTab(tab: SidebarTab) {
    $pub_crate$_sidebar_tabs.set(tab.id, tab);
    registration_update.value++;
}

export interface MainViewComponentProps {
    x: number;
    y: number;
    w: number;
    h: number;
    id: string;
    onMovePointerDown: (e: PointerEvent) => void;
    onResizePointerDown: (e: PointerEvent) => void;
    onContextMenu: (e: MouseEvent) => void;
}

export type MainViewContextComponent = (p: {
    close_window: () => void;
}) => JSX.Element;

export interface MainView {
    id: string;
    icon: string;
    name: string;
    component: (p: MainViewComponentProps) => JSX.Element;
    contextMenu: MainViewContextComponent;
}

export const $pub_crate$_main_views = new Map<string, MainView>();

export function registerMainView(view: MainView) {
    $pub_crate$_main_views.set(view.id, view);
    registration_update.value++;
}

export interface BottomBarItem {
    id: string;
    component: () => JSX.Element;
}

export const $pub_crate$_bottom_bar_items = new Map<string, BottomBarItem>();

export function registerBottomBarItem(item: BottomBarItem) {
    $pub_crate$_bottom_bar_items.set(item.id, item);
    registration_update.value++;
}
