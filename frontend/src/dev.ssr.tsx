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

import { StatusCode } from "hono/utils/http-status";
import { SSRContext } from "@deno-plc/router";
import { importCSS } from "./material-icons.ssr.ts";
import { encodeBase58 } from "@std/encoding/base58";

export function DevSSR(path: string, onError: (code: StatusCode) => void) {
    return (
        <SSRContext path={path} error={onError}>
            <html>
                <head>
                    <title>Deno-PLC HMI (Development Mode)</title>
                    <meta
                        name="viewport"
                        content="width=device-width, initial-scale=1"
                    >
                    </meta>
                    <script type="module" src="/@vite/client" async />
                    <script type="module" src="/frontend/src/dev.client.tsx" async />
                    <script type="module" src="/dev-assets/tailwind" async />
                    <script type="module" src="/@id/@xterm/xterm/css/xterm.css" async />
                    {/* <link rel="stylesheet" href={`@xterm/xterm/css/xterm.css`} /> */}
                    <style
                        dangerouslySetInnerHTML={{
                            /* Subset of tailwind preflight + black bg + white scrollbar */
                            __html: `
*,::after,::before{box-sizing:border-box;border-width:0;border-style:solid;scrollbar-width:thin;scrollbar-color:#ddd transparent}
:host,html{line-height:1.5;-webkit-text-size-adjust:100%;-moz-tab-size:4;tab-size:4;font-family:"Source Sans 3",ui-sans-serif,system-ui,sans-serif;font-feature-settings:normal;font-variation-settings:normal;-webkit-tap-highlight-color:transparent}
body{margin:0;line-height:inherit;background-color:black;color:white;overflow:auto;height:100vh}
.hidden,[hidden]{display:none}
img,svg,video,canvas,audio,iframe,embed,object{display:block;vertical-align:middle;}
${importCSS("dev")}

#app-main{
   background-image: url("/src/img/bg.png");
   background-size: 100% 100%;
}
          `,
                        }}
                    />
                </head>
                <body>
                    <span class={`bg-black text-brand flex flex-row items-center justify-center w-full h-full`}>loading...</span>
                    {/* <DevRouter /> */}
                </body>
            </html>
        </SSRContext>
    );
}

export async function tailwind_config_code(): Promise<string> {
    const hash = await crypto.subtle.digest("SHA-256", await Deno.readFile("./tailwind.config.ts"));
    const tailwind_config = await import("../../tailwind.config.ts?t=" + encodeBase58(new Uint8Array(hash)));
    return `tailwind.config = ${JSON.stringify(tailwind_config.default)};`;
}
