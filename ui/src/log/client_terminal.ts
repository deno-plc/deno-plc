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

import { ansiColorFormatter, type Sink } from "@logtape/logtape";
import { signal } from "@deno-plc/signals";

const PAGE_SIZE = 20;
const MAX_PAGE_DEFAULT = 60 / 20;
const MAX_PAGES = (() => {
    const truncateOption = new URL(location.href).searchParams.get("log-truncate");
    if (!truncateOption) return MAX_PAGE_DEFAULT;
    if (truncateOption.startsWith("Inf")) return Infinity;
    const truncate = parseInt(truncateOption);
    if (isNaN(truncate) || truncate < 0) return MAX_PAGE_DEFAULT;
    return Math.floor(truncate / PAGE_SIZE);
})();

const records: string[][] = [[]];

export const truncatedLogs = signal(0);

const listener = new Set<(rec: string) => void>();

export function getLogs(cb: (rec: string) => void) {
    listener.add(cb);
    for (const page of records) {
        for (const rec of page) {
            cb(rec);
        }
    }

    return () => {
        listener.delete(cb);
    };
}

export const clientTerminal: Sink = (rec) => {
    const record = ansiColorFormatter(rec);
    for (const $ of listener) {
        $(record);
    }

    while (records.length > MAX_PAGES) {
        const rem = records.shift();
        if (rem) {
            truncatedLogs.value += rem.length;
        }
    }

    const lastPage = records.length - 1;

    if (records[lastPage].length >= PAGE_SIZE) {
        records.push([record]);
    } else {
        records[lastPage].push(record);
    }
};
