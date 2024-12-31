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

import { type ITerminalOptions, Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { useRef } from "preact/hooks";
import type { FunctionComponent } from "preact";

export function useTerminal(conf?: () => ITerminalOptions): UseTerminal {
    const use = useRef<UseTerminal>();
    if (!use.current) {
        use.current = new UseTerminal({
            ...conf?.(),
        });
    }
    return use.current;
}

class UseTerminal {
    constructor(opt: ITerminalOptions) {
        this.inner = new Terminal(opt);
        this.inner.loadAddon(this.#fit);
    }
    inner: Terminal;
    #fit = new FitAddon();
    #observer = new ResizeObserver(() => {
        this.#handleResize();
    });
    #timeout: number = -1;
    #handleResize() {
        if (this.#timeout === -1) {
            this.#timeout = setTimeout(() => {
                this.#fit.fit();
                this.#timeout = -1;
            }, 100);
        }
    }
    #node: HTMLDivElement | null = null;
    #handleNode(node: HTMLDivElement | null) {
        if (this.#node === node) {
            return;
        }

        if (node) {
            if (this.#node) {
                this.#handleNode(null);
            }
            this.inner.open(node);
            this.#observer.observe(node);
            setTimeout(() => {
                this.#fit.fit();
            }, 0);
        } else {
            this.inner.dispose();
            this.#fit.dispose();
            this.#observer.disconnect();
        }
    }
    public Render: FunctionComponent = () => {
        return (
            <div class={"w-full h-full bg-black p-2 overflow-hidden"}>
                <div
                    class={`size-full`}
                    ref={(node) => {
                        this.#handleNode(node);
                    }}
                >
                </div>
            </div>
        );
    };
}
