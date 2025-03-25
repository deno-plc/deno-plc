/**
 * @license GPL-3.0-or-later
 * Deno-PLC HMI
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

import type { ComponentChildren, VNode } from "preact";
import { Bsod, BsodFromAny } from "./Bsod.tsx";
import { useEffect, useErrorBoundary } from "preact/hooks";
import { getLogger } from "@logtape/logtape";
import { navigate } from "@deno-plc/router";
import { useSignal } from "@deno-plc/signals";
import { MapSignal } from "@deno-plc/signal-utils/map";

const panic_logger = getLogger(["app", "panic"]);
const panic_logger_no_console = getLogger(["app_nc", "panic"]);

const panic_store = new MapSignal<string, Panic>();

export abstract class Panic {
    abstract code: string;
    abstract rt_mode: string;
    abstract err: unknown;
}

let panic_counter = 0;

export class PanicPanic extends Panic {
    code = "MAIN_THREAD_PANIC";
    rt_mode = "JS";
    constructor(readonly err: unknown) {
        super();
    }
}

export function panic(err: unknown) {
    panic_store.set(`CLIENT_MAIN_THREAD_PANIC+${panic_counter}`, err instanceof Panic ? err : new PanicPanic(err));
    panic_counter++;
    panic_logger.fatal`Panic: ${err}`;
}

// @ts-ignore global
self.panic = panic;

export class UncaughtExceptionPanic extends Panic {
    code = "MAIN_THREAD_UNCAUGHT_EXCEPTION";
    rt_mode = "JS";
    constructor(readonly err: unknown) {
        super();
    }
}

addEventListener("error", (ev) => {
    panic_store.set(`CLIENT_MAIN_THREAD_UNCAUGHT_EXCEPTION+${panic_counter}`, new UncaughtExceptionPanic(ev.error ?? ev));
    panic_counter++;
    panic_logger.fatal`Uncaught exception: ${ev}`;
});

export class UnhandledRejectionPanic extends Panic {
    code = "MAIN_THREAD_UNHANDLED_PROMISE_REJECTION";
    rt_mode = "JS";
    constructor(readonly err: unknown) {
        super();
    }
}

addEventListener("unhandledrejection", (ev) => {
    panic_store.set(`CLIENT_MAIN_THREAD_UNHANDLED_PROMISE_REJECTION+${panic_counter}`, new UnhandledRejectionPanic(ev.reason));
    panic_counter++;
    panic_logger_no_console.fatal`Unhandled rejection: ${ev.reason}`;
});

export class WASMPanic extends Panic {
    code = "MAIN_THREAD_PANIC";
    rt_mode = "WASM";
    constructor(readonly err: string) {
        super();
    }
}

export function wasm_panic(err: string) {
    panic_store.set(`WEB_ASSEMBLY_MAIN_THREAD_PANICKED+${panic_counter}`, new WASMPanic(err));
    panic_counter++;
    panic_logger_no_console.fatal(`WebAssembly panic: ${err}`);
}

export function GlobalPanic(p: {
    children?: ComponentChildren;
    context_isolation?: boolean;
    secure_context?: boolean;
}): VNode {
    const isSecureContext = p.secure_context === false ||
        self.isSecureContext ||
        new URL(location.href).searchParams.has("treat-as-secure-context") ||
        "Deno" in self;

    const isContextIsolated = self.crossOriginIsolated;

    const [render_error, reset_render_rr_] = useErrorBoundary();

    function reset_render_err() {
        panic_logger.warn`Resetting error: ${render_error}`;
        reset_render_rr_();
    }

    useEffect(() => {
        if (render_error) {
            panic_logger.fatal`Uncaught exception: ${render_error}`;
        }
    }, [render_error]);

    if (!isSecureContext) {
        /**
         * This application does not support insecure contexts, because multiple Web APIs are only available in secure contexts.
         *
         * Try loading the application via HTTPS (and accept the self-signed certificate) or use the `--unsafely-treat-insecure-origin-as-secure` browser flag
         */
        return <Bsod errorcode="INSECURE_BROWSING_CONTEXT"></Bsod>;
    } else if (!isContextIsolated && p.context_isolation) {
        /**
         * This application depends on APIs that are for security reasons only available if advanced context isolation is enabled
         *
         * Make sure the following headers are set: `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: credentialless`
         */
        return <Bsod errorcode="BROWSING_CONTEXT_NOT_ISOLATED"></Bsod>;
    } else if (render_error) {
        return (
            <BsodFromAny error={render_error} errorcode="CLIENT_RENDERER_PANIC">
                <div class={`flex flex-row gap-4 m-8`}>
                    <div
                        class={`bg-white text-blue-600 px-4 py-1 rounded text-lg font-semibold`}
                        onClick={() => {
                            reset_render_err();
                            navigate("/~deno-plc/logs");
                        }}
                    >
                        Show Logs
                    </div>
                    <div
                        class={`bg-white text-blue-600 px-4 py-1 rounded text-lg font-semibold`}
                        onClick={() => {
                            reset_render_err();
                        }}
                    >
                        Ignore & Continue
                    </div>
                </div>
            </BsodFromAny>
        );
    } else {
        return <ExtendedPanicHandler>{p.children}</ExtendedPanicHandler>;
    }
}

function ExtendedPanicHandler(p: {
    children: ComponentChildren;
}) {
    const panics = [...panic_store.entries()];

    const panic_id = useSignal(-1);

    useEffect(() => {
        if (panic_id.value === -1) {
            if (panics.length > 0) {
                panic_id.value = 0;
            }
        }
        if (panic_id.value !== -1) {
            if (panics[panic_id.value] === undefined) {
                panic_id.value--;
            }
        }
    }, [panics.length, panic_id.value]);

    if (panics.length > 0) {
        const [code, panic] = panics[panic_id.value] ?? [];
        return (
            <BsodFromAny error={panic} errorcode={panic?.code}>
                {panics.length > 1
                    ? (
                        <div class={`flex flex-row gap-4 m-8`}>
                            There are {panics.length - 1} more panics
                        </div>
                    )
                    : null}
                <div class={`flex flex-row gap-4 m-8`}>
                    {panics.length - 1 > panic_id.value
                        ? (
                            <div
                                class={`bg-white text-blue-600 px-4 py-1 rounded text-lg font-semibold`}
                                onClick={() => {
                                    panic_id.value++;
                                }}
                            >
                                Show Next
                            </div>
                        )
                        : null}
                    {panic_id.value > 0
                        ? (
                            <div
                                class={`bg-white text-blue-600 px-4 py-1 rounded text-lg font-semibold`}
                                onClick={() => {
                                    panic_id.value--;
                                }}
                            >
                                Show Previous
                            </div>
                        )
                        : null}
                    <div
                        class={`bg-white text-blue-600 px-4 py-1 rounded text-lg font-semibold`}
                        onClick={() => {
                            panic_store.delete(code);
                            navigate("/~deno-plc/logs");
                        }}
                    >
                        Show Logs
                    </div>
                    <div
                        class={`bg-white text-blue-600 px-4 py-1 rounded text-lg font-semibold`}
                        onClick={() => {
                            panic_store.delete(code);
                            panic_store.clear();
                        }}
                    >
                        Ignore & Continue
                    </div>
                </div>
            </BsodFromAny>
        );
    } else {
        return <>{p.children}</>;
    }
}
