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

import { get_nightly, type LocalStorageNightly } from "@deno-plc/utils/nightly";
import { Ms } from "../icons/Ms.tsx";
import { type Signal, useSignal } from "@deno-plc/signals";
import { NumberInput, Switch, TextInput } from "../forms/Forms.tsx";
import type { VNode } from "preact";

export function NightlyBadge(p: {
    provider: LocalStorageNightly;
}): VNode | null {
    if (p.provider.pending_reload.value) {
        return (
            <div
                class={`h-10 text-lg rounded-full bg-stone-800 border border-accent flex flex-row items-center justify-center px-3`}
                onClick={() => {
                    location.reload();
                }}
            >
                Pending nightly flag update, click here to apply
            </div>
        );
    } else {
        return null;
    }
}

export function EditNightly(p: {
    provider: LocalStorageNightly;
}): VNode {
    p.provider.update_view.value;
    const edit = useSignal<string | null>(null);
    return (
        <div class={`size-full overflow-auto bg-bg-800/50 relative`}>
            <div class={`grid grid-cols-2`}>
                <div class={`sticky border-r border-b border-accent px-3 py-1`}>ID</div>
                <div class={`sticky border-b border-accent px-3 py-1`}>Value</div>
                {[
                    ...p.provider.preview_options.entries().map(([key, value]) => (
                        <>
                            <div
                                class={`border-r border-b border-accent px-3 py-1`}
                                onClick={() => edit.value = key}
                            >
                                {key}
                            </div>
                            <div class={`border-b border-accent px-3 py-1`} onClick={() => edit.value = key}>
                                <div>{JSON.stringify(value)}</div>
                                {p.provider.options.get(key) !== value && <div>Current: {JSON.stringify(p.provider.options.get(key))}</div>}
                            </div>
                        </>
                    )),
                ]}
            </div>
            {edit.value && <ValueEdit id={edit.value} close={() => edit.value = null} provider={p.provider} />}
        </div>
    );
}

function ValueEdit(p: {
    id: string;
    close: VoidFunction;
    provider: LocalStorageNightly;
}): VNode {
    const value = useSignal(p.provider.preview_options.get(p.id) ?? null);

    const backup_value = useSignal(p.provider.preview_options.get(p.id));

    const ok = () => {
        p.provider.update(p.id, value.value);
        p.close();
    };
    return (
        <div
            class={`absolute top-0 left-0 size-full bg-bg-800/25 flex flex-row items-center justify-center z-10`}
            onClick={() => p.close()}
            onKeyDown={(ev) => {
                if (ev.key === "Enter") {
                    ok();
                }
            }}
        >
            <div
                class={`bg-bg-800 rounded border border-accent max-h-[80%] max-w-[80%] overflow-auto min-h-10 p-4 flex flex-col gap-4 items-center`}
                onClick={(ev) => ev.stopPropagation()}
            >
                <div class={`text-xl font-bold`}>Edit Option</div>
                {/* <TextInput value={key} label="Nightly option ID" /> */}

                <div class={`font-mono bg-bg-700 rounded px-2 py-1`}>{p.id}</div>

                <div class={`flex flex-row justify-center gap-4`}>
                    <div
                        class={`bg-bg-600 flex flex-row items-center gap-1 rounded border border-accent px-2 py-1`}
                        onClick={() => {
                            if (backup_value.value === "false" || backup_value.value?.toString() === "0") {
                                value.value = false;
                                backup_value.value = false;
                            } else if (backup_value.value === "true" || backup_value.value?.toString() === "1") {
                                value.value = true;
                                backup_value.value = true;
                            } else {
                                value.value = Boolean(backup_value.value);
                            }
                        }}
                    >
                        <Ms class="text-xl">switch_right</Ms>
                        <div>Bool</div>
                    </div>
                    <div
                        class={`bg-bg-600 flex flex-row items-center gap-1 rounded border border-accent px-2 py-1`}
                        onClick={() => {
                            value.value = String(backup_value.value);
                        }}
                    >
                        <Ms class="text-xl">abc</Ms>
                        <div>String</div>
                    </div>
                    <div
                        class={`bg-bg-600 flex flex-row items-center gap-1 rounded border border-accent px-2 py-1`}
                        onClick={() => {
                            value.value = Number(backup_value.value);
                        }}
                    >
                        <Ms class="text-xl">123</Ms>
                        <div>Number</div>
                    </div>
                    <div
                        class={`bg-bg-600 flex flex-row items-center gap-1 rounded border border-accent px-2 py-1`}
                        onClick={() => {
                            value.value = null;
                        }}
                    >
                        <Ms class="text-xl">delete</Ms>
                        <div>Null</div>
                    </div>
                </div>

                {typeof value.value === "boolean" && (
                    <Switch
                        value={value as Signal<boolean>}
                        label="Value"
                        onUpdate={(v) => backup_value.value = v}
                        autofocus
                    />
                )}
                {typeof value.value === "string" && (
                    <TextInput
                        value={value as Signal<string>}
                        label="Value"
                        onUpdate={(v) => backup_value.value = v}
                        autofocus
                    />
                )}
                {typeof value.value === "number" && (
                    <NumberInput
                        value={value as Signal<number>}
                        label="Value"
                        onUpdate={(v) => backup_value.value = v}
                        autofocus
                    />
                )}
                {value.value === null && <div class={`text-lg text-stone-300`}>Null</div>}

                <div class={`flex flex-row justify-center gap-4`}>
                    {get_nightly(p.id) !== value.value && (
                        <div
                            class={`bg-amber-600 text-white text-lg font-semibold flex flex-row px-2 py-1 items-center gap-1 rounded basis-0 grow select-none`}
                            onClick={() => {
                                p.provider.update(p.id, get_nightly(p.id));
                                p.close();
                            }}
                        >
                            <Ms class="text-xl">undo</Ms>
                            <div>Reset</div>
                        </div>
                    )}
                    <div
                        class={`bg-bg-600 text-white text-lg font-semibold flex flex-row px-2 py-1 items-center gap-1 rounded basis-0 grow select-none`}
                        onClick={() => {
                            p.close();
                        }}
                    >
                        <Ms class="text-xl">close</Ms>
                        <div>Cancel</div>
                    </div>
                    <div
                        class={`bg-green-600 text-white text-lg font-semibold flex flex-row px-2 py-1 items-center gap-1 rounded basis-0 grow select-none`}
                        onClick={ok}
                    >
                        <Ms class="text-xl">check</Ms>
                        <div>Ok</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
