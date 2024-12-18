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

import { kebabCase, titleCase } from "@luca/cases";
import { join } from "jsr:@std/path@^1.0.4/join";
import { z } from "zod";

function css_for_family(fam: string, mode: "dev" | "build") {
    const kebab = `material-symbols-${fam}`;
    const name = titleCase(kebab);

    const src = mode === "dev" ? `/dev-assets/material-symbols/${fam}` : `/assets/${kebab}.woff2`;

    return `
/* ${name} */
@font-face {
  font-family: "${name}";
  font-style: normal;
  font-weight: 100 700;
  font-display: block;
  src: url("${src}") format("woff2");
}
.${kebab} {
  font-family: "${name}";
  font-weight: normal;
  font-style: normal;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  font-feature-settings: "liga";
  width: 1em;
  overflow: hidden;
}`;
}

export function importCSS(mode: "dev" | "build") {
    return `
${css_for_family("outlined", mode)}
${css_for_family("rounded", mode)}
${css_for_family("sharp", mode)}
`;
}

async function deno_info<S extends z.ZodType>(args: string[], schema: S): Promise<z.infer<S>> {
    return schema.parse(
        JSON.parse(new TextDecoder().decode((await new Deno.Command(Deno.execPath(), { args: ["info", "--json", ...args] }).output()).stdout)),
    );
}

const deno_dir_pr = deno_info(
    [],
    z.object({
        npmCache: z.string(),
    }),
);

const material_symbols_version_pr = deno_info(
    ["npm:material-symbols"],
    z.object({
        modules: z.object({
            npmPackage: z.string().transform((full) => full.substring("material-symbols@".length)),
        }).array(),
    }),
);

export async function getPath(fam: string) {
    fam = kebabCase(fam);
    if (fam.startsWith("material-symbols-")) {
        fam = fam.substring(17);
    }

    return join(
        (await deno_dir_pr).npmCache,
        "registry.npmjs.org",
        "material-symbols",
        (await material_symbols_version_pr).modules[0].npmPackage,
        `material-symbols-${fam}.woff2`,
    );
}
