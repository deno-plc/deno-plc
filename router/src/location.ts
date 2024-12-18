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

import { computed, effect, type ReadonlySignal, signal } from "@deno-plc/signals";
import { useSSRContext } from "./ssr.tsx";
import { getLogger } from "@logtape/logtape";

const logger = getLogger(["app", "navigation"]);

const _current_location = signal(location?.pathname);

export const current_location: ReadonlySignal<string> = computed(() => _current_location.value);

effect(() => {
    logger.info`Navigated to ${current_location.value}`;
});

addEventListener("popstate", () => {
    _current_location.value = location.pathname;
});

export function useLocation(): string {
    const ssr_ctx = useSSRContext();
    if (ssr_ctx.ssr) {
        return ssr_ctx.path;
    } else {
        return _current_location.value;
    }
}

export function navigate(path: string) {
    history.pushState({}, "", path);
    _current_location.value = location.pathname;
}

export function redirect(path: string) {
    history.replaceState({}, "", path);
    _current_location.value = location.pathname;
}
