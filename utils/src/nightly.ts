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

/**
 * @module nightly
 *
 * The nightly module helps shipping experimental features to users but
 * not enabling them by default. It can be used as a general purpose
 * settings system too.
 *
 * It provides some abstraction, for browsers there is LocalStorageNightly,
 * for servers you would use a configuration file or CLI flags.
 */

import { getLogger } from "@logtape/logtape";
import { z } from "zod";
import { computed, type ReadonlySignal, type Signal, signal } from "@deno-plc/signals";
import { Lock } from "./lock.ts";

const logger = getLogger(["app", "nightly"]);

const NIGHTLY_SYMBOL = Symbol.for("@deno-plc/utils/nightly/SYMBOL:NIGHTLY");
const NIGHTLY_INITIALIZED_SYMBOL = Symbol.for("@deno-plc/utils/nightly/SYMBOL:NIGHTLY-INITIALIZED");

/**
 * The value of a nightly flag can be a string, boolean, number or null (default value).
 */
export type NightlyValue = string | boolean | number | null;

/**
 * Abstraction for a nightly flags provider.
 */
export class Nightly {
    constructor(readonly options: Map<string, NightlyValue>) {
        if (this.options.size > 0) {
            for (const [key, value] of this.options) {
                if (value !== null) {
                    logger.info`Using Nightly flag: ${key}=${value}`;
                }
            }
        } else {
            logger.info`No nightly flags were set`;
        }
    }

    protected create_key: (id: string) => void = () => {};

    get(id: string): NightlyValue {
        if (this.options.has(id)) {
            return this.options.get(id)!;
        } else {
            this.options.set(id, null);
            this.create_key(id);
            return null;
        }
    }
}

// @ts-ignore globals
const next_init = self[NIGHTLY_INITIALIZED_SYMBOL];

const nightly_lock = new Lock(true);

// @ts-ignore globals
self[NIGHTLY_INITIALIZED_SYMBOL] = () => {
    nightly_lock.unlock();
    if (next_init) {
        next_init();
    }
};

/**
 * sets a provider as global nightly provider
 */
export function init_nightly(provider: Nightly) {
    // @ts-ignore globals
    if (self[NIGHTLY_SYMBOL]) {
        throw new Error("Nightly already initialized");
    }
    // @ts-ignore globals
    self[NIGHTLY_SYMBOL] = provider;

    // @ts-ignore globals
    self[NIGHTLY_INITIALIZED_SYMBOL]();
}

const Storage = z.record(z.union([z.string(), z.boolean(), z.number(), z.null()]));
type Storage = z.infer<typeof Storage>;

/**
 * Nightly provider for use in browsers that uses localStorage to store the flags.
 *
 * A convenient editor UI is available in @deno-plc/ui
 */
export class LocalStorageNightly extends Nightly {
    constructor() {
        const config = localStorage.getItem("nightly");

        let res = new Map<string, NightlyValue>();

        if (config) {
            const a = Storage.safeParse(JSON.parse(config));
            if (a.success) {
                res = new Map(Object.entries(a.data));
            } else {
                logger.error`Failed to parse nightly config: ${a.error}`;
            }
        } else {
            logger.info`No nightly flags were set`;
        }

        super(res);

        addEventListener("storage", (e) => {
            if (e.key === "nightly") {
                const a = Storage.safeParse(JSON.parse(e.newValue ?? "{}"));
                if (a.success) {
                    new Map(Object.entries(a.data)).forEach((value, key) => {
                        this.preview_options.set(key, value);
                        this.updated_keys.add(key);
                    });
                    this.update_view.value++;
                }
            }
        });

        this.create_key = (id: string) => {
            this.preview_options.set(id, null);
            this.update_view.value++;
        };
    }

    updated_keys: Set<string> = new Set();

    pending_reload: ReadonlySignal<boolean> = computed(() => {
        this.update_view.value;
        for (const $ of this.updated_keys) {
            if (this.preview_options.get($) !== this.options.get($)) {
                return true;
            } else {
                this.updated_keys.delete($);
            }
        }
        return false;
    });
    update_view: Signal<number> = signal(0);

    preview_options: Map<string, NightlyValue> = new Map(this.options);

    /**
     * In contrast to other providers this allows editing the flags.
     */
    update(id: string, value: NightlyValue) {
        this.preview_options.set(id, value);
        localStorage.setItem("nightly", JSON.stringify(Object.fromEntries(this.preview_options)));
        this.updated_keys.add(id);
        this.update_view.value++;
    }
}

/**
 * Wait for the nightly provider to be initialized and return the value of a nightly flag.
 */
export async function wait_nightly(id: string): Promise<NightlyValue> {
    // @ts-ignore globals
    if (!self[NIGHTLY_SYMBOL]) {
        await nightly_lock.wait();
    }
    // @ts-ignore globals
    return (self[NIGHTLY_SYMBOL] as Nightly).get(id);
}

/**
 * Wait for the nightly provider to be initialized and return the provider.
 */
export async function wait_nightly_provider(): Promise<Nightly> {
    // @ts-ignore globals
    if (!self[NIGHTLY_SYMBOL]) {
        await nightly_lock.wait();
    }
    // @ts-ignore globals
    return self[NIGHTLY_SYMBOL];
}

/**
 * Get the value of a nightly flag or null if not initialized.
 */
export function get_nightly(id: string): NightlyValue {
    // @ts-ignore globals
    if (!self[NIGHTLY_SYMBOL]) {
        return null;
    }
    // @ts-ignore globals
    return (self[NIGHTLY_SYMBOL] as Nightly).get(id);
}

/**
 * Get the nightly provider or null if not initialized.
 */
export function get_nightly_provider(): Nightly | null {
    // @ts-ignore globals
    if (!self[NIGHTLY_SYMBOL]) {
        return null;
    }
    // @ts-ignore globals
    return self[NIGHTLY_SYMBOL];
}
