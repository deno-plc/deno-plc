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

import type { ComponentChildren, VNode } from "preact";
import { useSSRContext } from "@deno-plc/router";
import { useEffect, useMemo } from "preact/hooks";
import { MapSignal } from "@deno-plc/signal-utils/map";
import { batch } from "@deno-plc/signals";
import { Panic } from "./Panic.tsx";

type VersionList = {
    brand: string;
    version: string;
}[];

interface HighEntropyValues {
    brands?: VersionList;
    mobile?: boolean;
    platform?: string;
    architecture?: string;
    bitness?: string;
    formFactor?: string;
    fullVersionList?: VersionList;
    model?: string;
    platformVersion?: string;
    wow64?: boolean;
}

interface UAData {
    brands: VersionList;
    mobile: boolean;
    platform: string;
    getHighEntropyValues(hints: (keyof HighEntropyValues)[]): Promise<HighEntropyValues>;
}

const MORE_INFO_LABEL = "More Info";

export function Bsod(p: {
    children?: ComponentChildren;
    errorcode: string;
    additional_context?: [ComponentChildren, ComponentChildren][];
    // stack?: string,
}): VNode {
    const ssr_ctx = useSSRContext();
    const system_info = useMemo(() => new MapSignal<string, string>(), []);
    useEffect(() => {
        if ("userAgentData" in navigator) {
            const uaData = navigator.userAgentData as UAData;
            batch(() => {
                if (uaData.mobile) {
                    system_info.set("Mobile", `yes`);
                }
                for (const { brand, version } of uaData.brands) {
                    if (brand.toLowerCase().includes("not") && brand.toLowerCase().includes("brand")) {
                        continue;
                    }
                    system_info.set(`${brand} Version`, `${version}`);
                }
                system_info.set("OS", uaData.platform);
                system_info.set(MORE_INFO_LABEL, "fetching ...");
            });

            uaData.getHighEntropyValues(["architecture", "bitness", "fullVersionList", "platformVersion", "formFactor", "model"]).then((values) => {
                console.log(values);
                batch(() => {
                    system_info.delete(MORE_INFO_LABEL);
                    if (values.bitness) {
                        system_info.set("OS Arch", `${values.bitness}bits`);
                    }
                    if (values.architecture) {
                        system_info.set("OS Arch", `${values.architecture}${values.bitness ? `(${values.bitness}bit)` : ""}`);
                    }
                    if (values.fullVersionList) {
                        for (const { brand, version } of values.fullVersionList) {
                            if (brand.toLowerCase().includes("not") && brand.toLowerCase().includes("brand")) {
                                continue;
                            }
                            system_info.set(`${brand} Version`, `${version}`);
                        }
                    }
                    if (values.platformVersion) {
                        const platformVersion = values.platformVersion === "15.0.0" && uaData.platform === "Windows" ? "11" : values.platformVersion;
                        system_info.set("OS", `${uaData.platform} ${platformVersion}`);
                    }
                    if (values.formFactor) {
                        system_info.set("Form factor", values.formFactor);
                    }
                    if (values.model) {
                        system_info.set("Device", values.model);
                    }
                });
            }).catch(() => {
                system_info.set(MORE_INFO_LABEL, "Access denied");
            });
        }
    }, []);
    return (
        <div class="w-full h-full bg-blue-600 text-white select-text relative flex flex-col items-center overflow-hidden">
            <div
                class={`overflow-auto px-4 md:px-12 lg:px-[15%] w-full flex flex-col gap-8 pb-[10rem]`}
            >
                <div class={`text-[12rem]`}>:(</div>
                <div class={`text-3xl`}>
                    The HMI application ran into a serious problem it cannot recover from automatically. Please contact one of the administrators.
                </div>
                <div class={`text-md`}>
                    <div>
                        Code: <span class={`font-mono text-xl`}>{p.errorcode}</span>
                    </div>
                    <div>
                        Mode:{" "}
                        <span class={`font-mono text-xl`}>
                            {ssr_ctx.ssr ? `SSR` : `CSR`}
                        </span>
                    </div>
                    <div>
                        URL:{" "}
                        <span class={`font-mono text-xl`}>
                            {location?.href ?? "n/a"}
                        </span>
                    </div>
                    <div>
                        User-Agent:{" "}
                        <span class={`font-mono text-xl`}>
                            {navigator?.userAgent ?? "<Unknown>"}
                        </span>
                    </div>
                    {[...system_info.entries(), ...p.additional_context ?? []]?.map(([id, value]) => (
                        <div>
                            {id}:{" "}
                            <span class={`font-mono text-xl`}>
                                {value}
                            </span>
                        </div>
                    ))}
                </div>
                <div class={`text-xl`}>
                    {p.children}
                </div>
            </div>
            <div
                class={`w-full absolute left-0 bottom-0 h-0 shadow-blue-600 pointer-events-none`}
                style={{
                    boxShadow: `0 0 5rem 5rem var(--tw-shadow-color)`,
                }}
            >
            </div>
        </div>
    );
}

export function BsodText(p: {
    children: string;
}): VNode {
    return <>{p.children.split("\n").map(($, i) => <div key={i}>{$}</div>)}</>;
}

/**
 * preserve whitespace + keep ident even when line break
 */
export function BsodTerminal(p: {
    children: string;
}): VNode {
    return (
        <code class={`break-all whitespace-break-spaces`}>
            {p.children.split("\n").map(($, i) => <BsodTerminalLine key={i}>{$}</BsodTerminalLine>)}
        </code>
    );
}

function BsodTerminalLine(p: {
    children: string;
}) {
    const line = p.children;
    const trimmed = line.trimStart();
    const ident = line.length - trimmed.length;

    return (
        <div
            style={{
                paddingLeft: `${ident}ch`,
            }}
        >
            {trimmed.trimEnd()}
        </div>
    );
}

export function BsodFromAny(p: {
    error: unknown;
    errorcode?: string;
    children?: ComponentChildren;
}): VNode {
    if (p.error instanceof Panic) {
        return (
            <Bsod errorcode={p.error.code} additional_context={[["Runtime Mode", p.error.rt_mode]]}>
                <BsodTerminal>
                    {`${p.error.err}`}
                </BsodTerminal>
                {p.children}
            </Bsod>
        );
    } else if (p.error instanceof Error) {
        return (
            <Bsod errorcode={p.errorcode ?? `UNCAUGHT_EXCEPTION`}>
                <BsodTerminal>
                    {`
${p.error.name}
${p.error.message}
${p.error.stack ?? "No stacktrace available"}`}
                </BsodTerminal>
                {p.children}
            </Bsod>
        );
    } else {
        let asJSON = "";
        try {
            asJSON = JSON.stringify(p.error, undefined, 3);
        } catch (_err) {
            return (
                <Bsod errorcode="UNKNOWN_EXCEPTION">
                    {p.children}
                </Bsod>
            );
        }
        return (
            <Bsod errorcode={p.errorcode ?? `UNCAUGHT_EXCEPTION`}>
                <BsodTerminal>
                    {`${String(p.error)}\n(${typeof p.error})\n${asJSON}`}
                </BsodTerminal>
                {p.children}
            </Bsod>
        );
    }
}
