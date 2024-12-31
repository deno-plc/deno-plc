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

import { Notif, NotifType } from "../notifications/Notification.tsx";
import { NATS_Status, nats_status } from "@deno-plc/nats";
import { TimerSignal } from "@deno-plc/signal-utils/timer";
import { effect } from "@deno-plc/signals";
import type { VNode } from "preact";

const display_connected = new TimerSignal();
const nats_no_config_suppress = new TimerSignal();
nats_no_config_suppress.activate(2000);

effect(() => {
    if (nats_status.value === NATS_Status.Connected) {
        display_connected.activate(5000);
    }
});

export function NATSStatus(): VNode {
    return (
        <>
            <Notif
                type={NotifType.Progress}
                title="Connecting to NATS server"
                active={nats_status.value === NATS_Status.Connecting}
            >
                <div class={`rounded-full bg-stone-800 w-full h-2 relative my-3 overflow-hidden flex flex-row`}>
                    <div
                        class={`h-full bg-brand absolute rounded-full transition-all duration-300 animate-load`}
                    >
                    </div>
                </div>
            </Notif>
            <Notif
                type={NotifType.Success}
                title="Connected to NATS server"
                active={display_connected.value}
                onClose={() => {
                    display_connected.clear();
                }}
            />
            <Notif type={NotifType.Error} title="Error" active={nats_status.value === NATS_Status.Error}>
                Could not connect to NATS server.
            </Notif>
            <Notif type={NotifType.Error} title="Error" active={nats_status.value === NATS_Status.NotConfigured && !nats_no_config_suppress.value}>
                The NATS client is not configured.
            </Notif>
        </>
    );
}
