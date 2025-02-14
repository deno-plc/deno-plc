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

import { MapSignal } from "@deno-plc/signal-utils/map";
import { type Signal, signal, useComputed, useSignal } from "@deno-plc/signals";
import { useEffect } from "preact/hooks";
import { useTerminal } from "../terminal/Terminal.tsx";
import { getLogs, truncatedLogs } from "./console.ts";
import { useLocation } from "@deno-plc/router";
import type { VNode } from "preact";

const selfLogs = Symbol();
const selfID = crypto.randomUUID();

interface LogTerminal {
    readonly id: string;
    label: Signal<string>;
    readonly src: URL | typeof selfLogs;
}

const logTerminals = new MapSignal<string, LogTerminal>();

logTerminals.set(selfID, {
    label: signal("Client application"),
    src: selfLogs,
    id: selfID,
});

export function LogPage(): VNode {
    const active_id = useSignal("");
    const url = useLocation();
    useEffect(() => {
        active_id.value = url.substring("/deno-plc/logs/".length);
    }, [url]);
    const active = useComputed(() => {
        if (!logTerminals.has(active_id.value)) {
            active_id.value = logTerminals.peek_keys().next().value;
        }
        return logTerminals.get(active_id.value)!;
    });
    return (
        <div class={`overflow-auto size-full flex flex-col items-stretch bg-black`}>
            <div class={`basis-10 border-b border-accent flex flex-row items-stretch [&>*:not(:last-child)]:border-r overflow-x-auto`}>
                {[...logTerminals.values()].map((ter) => (
                    <div
                        class={`flex flex-row items-center justify-center grow border-accent font-semibold text-lg overflow-ellipsis overflow-hidden whitespace-nowrap min-w-fit px-4 basis-0 cursor-pointer  ${
                            ter === active.value ? `text-brand bg-bg-900` : `bg-bg-800`
                        }`}
                        onClick={() => {
                            active_id.value = ter.id;
                        }}
                    >
                        {ter.label}
                    </div>
                ))}
            </div>
            {active.value.src === selfLogs && truncatedLogs.value > 0
                ? (
                    <div class={`bg-bg-900 text-yellow-600 text-center py-1 px-4 border-yellow-600 border rounded m-2 self-center mb-0`}>
                        {truncatedLogs} log records were truncated
                    </div>
                )
                : null}
            <LogTerminal term={active.value} />
        </div>
    );
}

function LogTerminal(p: {
    term: LogTerminal;
}) {
    const XTerm = useTerminal(() => ({
        convertEol: true,
    }));

    useEffect(() => {
        XTerm.inner.reset();

        if (p.term.src === selfLogs) {
            const dispose = getLogs((rec) => {
                XTerm.inner.write(rec);
            });
            return dispose;
        }
    }, [p.term]);

    return (
        <div class={`grow overflow-hidden relative`}>
            <XTerm.Render />
        </div>
    );
}
