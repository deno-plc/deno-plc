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

import { pluginDeno } from "@deno-plc/vite-plugin-deno";
import prefresh from "@prefresh/vite";
import type { InlineConfig, Plugin } from "vite";

export interface ConfigOptions {
    input?: Record<string, string> | string;
    env: "deno" | "browser";
    build_id?: string;
}

export function config(o: ConfigOptions): InlineConfig {
    return {
        plugins: [
            {
                name: "Build Metadata",
                enforce: "pre",
                resolveId: {
                    order: "pre",
                    handler(id) {
                        if (id === "virtual:about-self") {
                            return id;
                        }
                    },
                },
                async load(id) {
                    if (id === "virtual:about-self") {
                        const deno_json = JSON.parse(
                            await Deno.readTextFile("./deno.json"),
                        );
                        return `// virtual:about-self
                    export const VERSION = "${deno_json.version}";
                    export const VARIANT = "DEV";
                    export const BUILD_ID = "${o.build_id ?? "00000000-0000-0000-0000-000000000000"}";
                    `;
                    }
                },
            },
            pluginDeno({
                env: o.env,
                undeclared_npm_imports: [
                    // injected by JSX transform
                    "preact/jsx-runtime",
                    "preact/jsx-dev-runtime",
                    // injected by HMR
                    "@prefresh/core",
                    "@prefresh/utils",
                    // injected by react compat
                    "@preact/compat",
                ],
                extra_import_map: new Map([
                    // react compat
                    ["react", "@preact/compat"],
                    ["react-dom", "@preact/compat"],
                    // ["node:util", "npm:util@0.12.5#standalone"],
                    // ["node:buffer", "npm:buffer@6.0.3#standalone"],
                    // ["node:buffer", "https://cdn.jsdelivr.net/npm/buffer@6.0.3/+esm#standalone"],
                    ["node:util", "https://cdn.jsdelivr.net/npm/util@0.12.5/+esm#standalone"],
                    // ["node:fs", toFileUrl(join(Deno.cwd(), "src/lib/fs.polyfill.ts")).href + "#standalone"]
                    // ["node:fs", "http://localhost/dev-assets/null#standalone"]
                    ["node:fs", "virtual:node:null"],

                    ["npm:tweetnacl@1.0.3", "https://cdn.jsdelivr.net/npm/tweetnacl@1.0.3/+esm#standalone"],
                ]),
                legacy_npm: ["@xterm/xterm", "@xterm/addon-fit"],
                exclude: [/@tauri-apps/, /\/v3\//, /@xterm\/xterm\/css/],
                hot_update_min_time: 500,
            }) as Plugin & { name: string },
            prefresh({
                exclude: [/^npm/, /registry.npmjs.org/, /^http/], // don't inject HMR into the HMR code and libs
            }) as Plugin & { name: string },
        ],
        esbuild: {
            jsx: "automatic",
            jsxImportSource: "preact",
        },
        server: {
            port: 81,
            watch: {
                ignored: ["**/target/**", "*.wasm-opt.wasm"], // rust build folder
            },
            host: "::1",
            warmup: {
                clientFiles: [
                    "./src/page/dev-client.tsx",
                ],
            },
        },
        build: {
            rollupOptions: {
                input: o.input,
            },
        },
    };
}
