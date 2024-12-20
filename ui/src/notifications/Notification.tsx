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
import { Ms } from "../icons/Ms.tsx";
import type { JSX as JSXInternal } from "preact/jsx-runtime";

export { NotificationAggregator } from "./aggregator.tsx";

export enum NotifType {
    Info,
    Progress,
    Success,
    Warn,
    Error,
}

export function Notif(p: {
    active?: boolean;
    children?: ComponentChildren;
    type: NotifType;
    color?: string;
    title: ComponentChildren;
    icon?: ComponentChildren;
    onClick?: JSXInternal.MouseEventHandler<HTMLDivElement>;
    onClose?: JSXInternal.MouseEventHandler<HTMLDivElement>;
}): VNode {
    return (
        <div
            class={`overflow-hidden w-full transition-all duration-200 motion-reduce:transition-none shrink-0 grow-0 relative ${
                p.active ? "pt-4 max-h-[15.5rem] left-0" : "pt-0 max-h-0 left-full"
            }`}
        >
            <div
                class={`w-full bg-bg-900 rounded-md flex flex-row relative border border-accent basis-auto pointer-events-auto max-h-[14rem]`}
                onClick={p.onClick}
            >
                <div
                    class={`self-center py-4 pl-3 text-[3.6rem] ${p.color ?? notifTextColor(p.type)} leading-none translate-y-1`}
                >
                    {p.icon ?? <DefaultNotifIcon type={p.type} />}
                </div>
                <div class={`p-3 grow pb-4 overflow-auto `}>
                    <div class={`font-semibold text-lg ${p.onClose ? `pr-8` : ``}`}>
                        {p.title}
                    </div>
                    <div class={`text-stone-300`}>{p.children}</div>
                </div>
                {p.onClose
                    ? (
                        <div
                            class={`absolute top-0 right-0 p-2`}
                            onClick={p.onClose}
                        >
                            <Ms>close</Ms>
                        </div>
                    )
                    : null}
            </div>
        </div>
    );
}

function notifTextColor(type: NotifType) {
    switch (type) {
        case NotifType.Info:
            return "text-blue-500";
        case NotifType.Progress:
            return "text-fuchsia-500";
        case NotifType.Success:
            return `text-green-600`;
        case NotifType.Warn:
            return `text-amber-500`;
        case NotifType.Error:
            return `text-red-600`;
    }
}

function DefaultNotifIcon(p: {
    type: NotifType;
}) {
    switch (p.type) {
        case NotifType.Info:
            return <Ms class={`text-[3.6rem]`}>info</Ms>;
        case NotifType.Progress:
            return <Ms class={`text-[3.6rem]`}>info</Ms>;
        case NotifType.Success:
            return <Ms class={`text-[3.6rem]`}>check_circle</Ms>;
        case NotifType.Warn:
            return <Ms class={`text-[3.6rem]`}>warning</Ms>;
        case NotifType.Error:
            return <Ms class={`text-[3.6rem]`}>warning</Ms>;
    }
}
