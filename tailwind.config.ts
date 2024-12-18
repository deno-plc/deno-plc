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

import type { Config } from "tailwindcss";

const config: Config = {
    content: ["./src/**/*.tsx"],
    theme: {
        extend: {
            colors: {
                brand: "rgb(51, 162, 56)",
                // brand: "rgb(65, 200, 16)",
                // accent: "#78716c",
                accent: "#4a4a4a",
                "bg-900": "#121210",
                "bg-800": "#191919",
                "bg-700": "#212121",
                "bg-600": "#2b2b2b",
            },
            keyframes: {
                load: {
                    "0%": {
                        left: "0%",
                        right: "100%",
                    },
                    "30%": {
                        left: "0%",
                    },
                    "50%": {
                        right: "0%",
                    },
                    "100%": {
                        left: "100%",
                        right: "0%",
                    },
                },
            },
            animation: {
                load: "load 2s linear infinite",
            },
            transitionProperty: {
                size: "width, height",
            },
        },
    },
    plugins: [],
};

export default config;
