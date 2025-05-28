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

import { useEffect } from "preact/hooks";
import type { JSX as JSXInternal, VNode } from "preact";
import { navigate, redirect } from "./location.ts";

/**
 * Wrapper for <a> elements that handles navigation
 */
export function Link(p: JSXInternal.HTMLAttributes<HTMLAnchorElement>): VNode {
    return (
        <a
            {...p}
            onClick={(ev) => {
                if (p.onClick) {
                    p.onClick(ev);
                }

                if (ev.defaultPrevented) {
                    return;
                }

                ev.stopPropagation();
                ev.preventDefault();

                if (typeof p.href === "object") {
                    const href = p.href.peek();
                    if (href) {
                        navigate(href);
                    }
                } else {
                    if (p.href) {
                        navigate(p.href);
                    }
                }
            }}
        >
            {p.children}
        </a>
    );
}

/**
 * Component that redirects to the given URL once it renders.
 */
export function Redirect(p: {
    href: string;
}): null {
    useEffect(() => {
        redirect(p.href);
    }, [p.href]);
    return null;
}
