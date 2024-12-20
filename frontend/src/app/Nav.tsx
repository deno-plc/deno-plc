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

import { ComponentChildren } from "preact";
import { Ms } from "@deno-plc/ui/icons-ms";
import { navigate, useLocation } from "@deno-plc/router";

function NavGroup(p: {
    title: string;
    children?: ComponentChildren;
}) {
    return (
        <div>
            <div class={`text-brand text-[1.1rem] font-semibold px-2 pt-3`}>{p.title}</div>
            <div class={`flex flex-col gap-1 px-1 py-1`}>{p.children}</div>
        </div>
    );
}

function NavLink(p: {
    icon?: ComponentChildren;
    activeIcon?: ComponentChildren;
    children?: ComponentChildren;
    href: string;
    hrefMatch?: RegExp;
}) {
    const loc = useLocation();
    const active = p.hrefMatch ? p.hrefMatch.test(loc) : loc === p.href;
    return (
        <a
            class={`flex flex-row rounded-md items-center py-1 px-3 gap-2 leading-none select-none bg-opacity-60 hover:bg-opacity-40 ${
                active ? `bg-bg-900 text-brand` : `hover:bg-bg-900`
            }`}
            href={p.href}
            onClick={(ev) => {
                ev.preventDefault();
                ev.stopPropagation();

                navigate(p.href);
            }}
        >
            <div class={`text-2xl leading-none align-middle translate-y-[2px]`}>{(active && p.activeIcon) ? p.activeIcon : p.icon}</div>
            <div class={`text-xl`}>{p.children}</div>
        </a>
    );
}

function NavLinkMs(p: {
    icon: string;
    noFill?: boolean;
    children?: ComponentChildren;
    href: string;
    hrefMatch?: RegExp;
}) {
    return (
        <NavLink icon={<Ms>{p.icon}</Ms>} activeIcon={<Ms fill={!p.noFill}>{p.icon}</Ms>} href={p.href} hrefMatch={p.hrefMatch}>{p.children}</NavLink>
    );
}

export function Nav() {
    return (
        <div class={`basis-72 shrink-0 grow-0 border-r border-accent bg-bg-800 bg-opacity-60`}>
            <NavGroup title="App">
                <NavLinkMs icon="house" href="/~home">Home</NavLinkMs>
                <NavLinkMs icon="browse" href="/~workbench">Workbench</NavLinkMs>
            </NavGroup>

            <NavGroup title="Dashboard">
                <NavLinkMs icon="lunch dining" href="/~dash/burger">Burger</NavLinkMs>
                <NavLinkMs icon="local pizza" href="/~dash/pizza">Pizza</NavLinkMs>
                <NavLink icon={<Ms fill>bakery dining</Ms>} activeIcon={<Ms fill class={`text-amber-600`}>bakery dining</Ms>} href="/~dash/croissant">
                    Croissant
                </NavLink>
                <NavLinkMs icon="ramen dining" href="/~dash/ramen">Ramen</NavLinkMs>
                <NavLinkMs icon="kebab dining" href="/~dash/kebab">Kebab</NavLinkMs>
                <NavLink
                    icon={<Ms>egg_alt</Ms>}
                    activeIcon={
                        <div class={`size-[1em] overflow-hidden`}>
                            <Ms class="text-[#fa0] absolute">egg_alt</Ms>
                            <Ms class="text-white absolute" fill>egg_alt</Ms>
                        </div>
                    }
                    href="/~dash/egg"
                >
                    Fried egg
                </NavLink>
            </NavGroup>

            <NavGroup title="Debug">
                <NavLinkMs icon="terminal" href="/~deno-plc/logs" hrefMatch={/^\/~deno-plc\/logs/}>Logs</NavLinkMs>
            </NavGroup>
        </div>
    );
}
