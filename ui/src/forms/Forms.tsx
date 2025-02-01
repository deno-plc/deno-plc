/**
 * @license GPL-3.0-or-later
 * Deno-PLC
 *
 * Copyright (C) 2025 Hans Schallmoser
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

import type { Signal } from "@deno-plc/signals";

export function TextInput(p: {
    value: Signal<string>;
    label: string;
    class?: string;
    onUpdate?: (value: string) => void;
    autofocus?: boolean;
}) {
    return (
        <input
            title={p.label}
            type="text"
            value={p.value.value}
            class={`border border-accent rounded w-full min-w-64 bg-bg-700 focus:outline outline-2 outline-brand px-2 py-1 ${p.class}`}
            autofocus={p.autofocus}
            onInput={(ev) => {
                const value = ev.currentTarget.value;
                p.value.value = value;
                p.onUpdate?.(value);
            }}
        />
    );
}

export function NumberInput(p: {
    value: Signal<number>;
    label: string;
    class?: string;
    onUpdate?: (value: number) => void;
    autofocus?: boolean;
}) {
    return (
        <input
            title={p.label}
            type="number"
            value={p.value.value}
            class={`border border-accent rounded w-full min-w-64 bg-bg-700 focus:outline outline-2 outline-brand px-2 py-1 ${p.class}`}
            autofocus={p.autofocus}
            onInput={(ev) => {
                const value = +ev.currentTarget.value;
                p.value.value = value;
                p.onUpdate?.(value);
            }}
        />
    );
}

export function Switch(p: {
    value: Signal<boolean>;
    label: string;
    class?: string;
    disabled?: boolean;
    onUpdate?: (value: boolean) => void;
    autofocus?: boolean;
}) {
    return (
        <div
            class={`inline-block relative w-12 h-6 border-2 rounded-full transition-colors ${
                p.value.value ? `bg-brand border-brand` : `bg-bg-600 border-bg-600`
            } ${p.class}`}
            tabIndex={p.disabled ? -1 : 0}
            autoFocus={p.autofocus}
            onClick={() => {
                if (p.disabled) return;
                const value = !p.value.value;
                p.value.value = value;
                p.onUpdate?.(value);
            }}
        >
            <div class={`absolute rounded-full size-5 transition-all ${p.value.value ? `left-6 bg-bg-600` : `left-0 bg-brand`}`}></div>
        </div>
    );
}
