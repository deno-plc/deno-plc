/**
 * @license GPL-3.0-or-later
 * Deno-PLC HMI
 *
 * Copyright (C) 2024 - 2025 Hans Schallmoser
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

import { StatusCode } from "hono/utils/http-status";
import { SSRContext } from "@deno-plc/router";
import { importCSS } from "./material-icons.ssr.ts";

export async function DevSSR(path: string, onError: (code: StatusCode) => void) {
    const [style, tailwind] = await Promise.all([
        Deno.readTextFile(new URL("./style/style.css", import.meta.url)),
        Deno.readTextFile(new URL("./style/tailwind.css", import.meta.url)),
    ]);

    return (
        <SSRContext path={path} error={onError}>
            <html class={`color-brand`}>
                <head>
                    <title>Deno-PLC HMI (Development Mode)</title>
                    <meta
                        name="viewport"
                        content="width=device-width, initial-scale=1"
                    />
                    <style dangerouslySetInnerHTML={{ __html: style }} />
                    <style dangerouslySetInnerHTML={{ __html: importCSS("dev") }} />
                    <style type="text/tailwindcss" dangerouslySetInnerHTML={{ __html: tailwind }} />
                    <script type="module" src="/dev-assets/tailwind-play" async />

                    <script type="module" src="/@vite/client" async />
                    <script type="module" src="/frontend/src/dev.client.tsx" async />

                    <script type="module" src="/@id/@xterm/xterm/css/xterm.css" async />
                </head>
                <body>
                    <span class={`bg-[#111] text-brand flex flex-row items-center justify-center w-full h-full`}>loading...</span>
                </body>
            </html>
        </SSRContext>
    );
}
