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

import { walkSync } from "@std/fs";
import { assert } from "@std/assert/assert";
import { parseArgs } from "@std/cli/parse-args";

assert(
    `
` === "\n",
);

let errors = 0;
let fixes = 0;

const args = parseArgs(Deno.args, {
    boolean: ["fix"],
    string: "author",
});

function licenseHeader(type: "rust" | "typescript" | "typescript-simple") {
    return `/*${type === "rust" ? `!` : type === "typescript" ? `*` : ""}\n * @license GPL-3.0-or-later\n * Deno-PLC`;
}

for (const entry of walkSync(Deno.cwd(), { includeDirs: false, skip: [/node_modules/, /target/, /pkg/] })) {
    const { name, path } = entry;

    if (name.endsWith(".ts") || name.endsWith(".tsx") || name.endsWith(".rs")) {
        const fileContent = await Deno.readTextFile(path);
        const fileType = name.endsWith(".rs") ? "rust" : "typescript";

        if (fileContent.includes("\r\n")) {
            console.warn(`%c[license-bot] CRLF line endings in ${path}`, "color: orange");
            errors++;
        } else if (!fileContent.includes(licenseHeader(fileType))) {
            if (fileType === "typescript") {
                if (fileContent.includes(licenseHeader("typescript-simple"))) {
                    if (args.fix) {
                        await Deno.writeTextFile(path, fileContent.replace(licenseHeader("typescript-simple"), licenseHeader("typescript")));
                        console.log(`%c[license-bot] Fixed license header in ${path}`, "color: green");
                        fixes++;
                        continue;
                    } else {
                        console.log(`%c[license-bot] Could automatically fix license header in ${path}`, "color: cyan");
                        fixes++;
                        errors++;
                        continue;
                    }
                } else if ((fileContent.includes("import ") || fileContent.includes("export ")) && !fileContent.includes("@license")) {
                    if (args.fix) {
                        if (args.author) {
                            await Deno.writeTextFile(
                                path,
                                `/**
 * @license GPL-3.0-or-later
 * Deno-PLC
 *
 * Copyright (C) ${new Date().getFullYear()} ${args.author}
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

${fileContent}`,
                            );
                            console.log(`%c[license-bot] Fixed license header in ${path}`, "color: green");
                            fixes++;
                            continue;
                        } else {
                            console.error(`%c[license-bot] Missing --author argument`, "color: red");
                            Deno.exit(1);
                        }
                    } else {
                        console.log(`%c[license-bot] Could automatically fix license header in ${path}`, "color: cyan");
                        fixes++;
                        errors++;
                        continue;
                    }
                }
            }
            console.error(`%c[license-bot] Missing @license comment in ${path}`, "color: red");
            errors++;
        }
    }
}

if (errors > 0) {
    console.error(`%c[license-bot] Found ${errors} files without license header`, "background-color: red");
} else {
    console.log("%c[license-bot] All files have license headers", "color: green");
}
if (fixes > 0) {
    if (args.fix) {
        console.log(`%c[license-bot] Fixed ${fixes} files`, "background-color: green");
    } else {
        console.log(`%c[license-bot] using \`--fix\` could automatically fix ${fixes} of those files`, "background-color: green");
    }
}

Deno.exit(errors > 0 ? 1 : 0);
