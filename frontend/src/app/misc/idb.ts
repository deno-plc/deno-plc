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

import { signal } from "@preact/signals";
import { OnceLock } from "../../lib/once_lock.ts";
import { z } from "zod";
import { IDBPDatabase, openDB } from "idb";

export const idbFail = signal("");

export const db_lock = new OnceLock<IDBPDatabase>();

export function get_db(): Promise<IDBPDatabase> {
    return db_lock.get();
}

export async function initIDB() {
    if (db_lock.initialized) {
        return;
    }
    if (!("indexedDB" in self)) {
        idbFail.value = "ERR_INDEXEDDB_UNAVAILABLE";
        return;
    }

    const db = await openDB("update", 1, {
        upgrade(db, old_v, new_v) {
            if (!db.objectStoreNames.contains("versions")) {
                const versions = db.createObjectStore("versions", { keyPath: "install_id" });
                versions.createIndex("manifest", "manifest_blob", {
                    unique: true,
                });
                versions.createIndex("build_id", "manifest.id", {
                    unique: true,
                });
            }

            if (!db.objectStoreNames.contains("kv")) {
                db.createObjectStore("kv");
            }

            if (!db.objectStoreNames.contains("blob")) {
                db.createObjectStore("blob");
            }

            console.log(`IndexedDB upgraded ${old_v} -> ${new_v}`);
        },
        blocked(current, blocked) {
            idbFail.value = `ERR_INDEXEDDB_OPEN_REQUEST_BLOCKED-${current}-${blocked}`;
        },
        blocking(current, blocked) {
            idbFail.value = `ERR_INDEXEDDB_OPEN_REQUEST_BLOCKING-${current}-${blocked}`;
        },
        terminated() {
            idbFail.value = "ERR_INDEXEDDB_OPEN_REQUEST_TERMINATED";
        },
    });

    idbFail.value = "";

    db_lock.init(db);
}

export async function KVget<Schema extends z.ZodType>(key: string, schema: Schema): Promise<z.infer<Schema>> {
    return schema.parse(await (await db_lock.get()).get("kv", key));
}
export async function KVset(key: string, val: unknown) {
    return (await db_lock.get()).put("kv", val, key);
}
export async function KVdelete(key: string) {
    return (await db_lock.get()).delete("kv", key);
}
