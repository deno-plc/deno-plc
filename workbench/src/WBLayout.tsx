/**
 * @license GPL-3.0-or-later
 * Deno-PLC
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

import { useContext, useEffect, useMemo, useRef } from "preact/hooks";
import { effect, signal, useSignal } from "@deno-plc/signals";
import { type ComponentChildren, createContext } from "preact";
import { BgCanvas } from "./GridCanvas.tsx";
import {
    $pub_crate$_main_views,
    type MainViewComponentProps,
    type MainViewContextComponent,
    type MainViewContextComponentProps,
    registerBottomBarItem,
    registerMainView,
    useRegistrationUpdate,
} from "./registration.tsx";
import { type LayoutModel, type LayoutModelWindow, useLayoutModel } from "./LayoutMem.tsx";
import { Vec2 } from "@deno-plc/utils/vec2";
import { Rect } from "@deno-plc/utils/rect";
import { Ms } from "@deno-plc/ui/icons-ms";
import { contextMenuPosition } from "@deno-plc/utils/geometry";
import { LogPage } from "../../ui/src/console/Terminal.tsx";

const MIN_CELL_SIZE = 100;

export class GridGeometryInfo {
    private constructor() {}
    cols: number = 0;
    rows: number = 0;
    col_size: number = 0;
    row_size: number = 0;
    width: number = 0;
    height: number = 0;

    public static null(): GridGeometryInfo {
        return new GridGeometryInfo();
    }

    public static compute(width: number, height: number): GridGeometryInfo {
        const cols = Math.floor(width / MIN_CELL_SIZE);
        const rows = Math.floor(height / MIN_CELL_SIZE);
        const col_size = width / cols;
        const row_size = height / rows;
        return { cols, rows, col_size, row_size, width, height };
    }
}

export const GridGeometryContext = createContext(GridGeometryInfo.null());

enum WBPointerMode {
    None,
    New,
    Move,
    Resize,
}

class WBLayoutState {
    constructor() {
        effect(() => { // reruns on pointer move (between cells)
            this.pointer.value; // some branches are controlled by non-signal values
            if (this.pointer_mode.value === WBPointerMode.New) {
                if (!this.pointer.value.eq(this.pointer_down_point.value) && !this.pointer_down_point.value.eq(new Vec2(-1, -1))) {
                    const r = Rect.from_start_end(this.pointer_down_point.value, this.pointer.value).fill_end();
                    if (this.is_unoccupied(r)) {
                        this.preview.value = r;
                        this.show_preview.value = true;
                    }
                }
            } else if (this.pointer_mode.value === WBPointerMode.Move) {
                const win = this.target_window;
                if (win) {
                    const pos = this.pointer.value;
                    const r = new Rect(pos.x, pos.y, win.w, win.h);
                    if (this.is_unoccupied(r, this.computeOccupiedCells([win]))) {
                        if (win.x !== pos.x || win.y !== pos.y) {
                            win.x = pos.x;
                            win.y = pos.y;
                            this.model_update();
                            this.clearOccupiedCells();
                        }
                    } else {
                        console.log("Failed to move Window: Occupied");
                    }
                    this.ignore_next_context_menu = true;
                }
            } else if (this.pointer_mode.value === WBPointerMode.Resize) {
                const win = this.target_window;
                if (win) {
                    const pos = this.pointer.value;
                    const r = Rect.from_base_size(new Vec2(win.x, win.y), pos.sub(new Vec2(win.x, win.y))).fill_end();
                    if (this.is_unoccupied(r, this.computeOccupiedCells([win]))) {
                        if (win.w !== r.w || win.h !== r.h) {
                            win.w = r.w;
                            win.h = r.h;
                            this.model_update();
                            this.clearOccupiedCells();
                        }
                    } else {
                        console.log("Failed to move Window: Occupied");
                    }
                    this.ignore_next_context_menu = true;
                }
            }
        });

        registerBottomBarItem({
            id: "WBLayoutStatus",
            component: () => {
                return (
                    <div class={`flex flex-row items-center px-2 hover:bg-bg-700`}>
                        {WBPointerMode[this.pointer_mode.value]} ({this.pointer.value.x},{this.pointer.value.y})
                    </div>
                );
            },
        });
    }

    // always up to date size of the viewport
    root_rect: DOMRectReadOnly | null = null;

    geo = GridGeometryInfo.null();

    occupied_cells = new Uint8Array(0);
    model: LayoutModel | null = null;
    model_update: VoidFunction = () => {};

    // current pointer position
    pointer = signal(new Vec2(0, 0));
    pointer_mode = signal(WBPointerMode.None);
    // position where the last pointerdown event happened
    pointer_down_point = signal(new Vec2(-1, -1));

    // target window for moves and resizes
    target_window: LayoutModelWindow | null = null;

    preview = signal(Rect.null());

    // shows the preview placeholder when creating windows and increases the bg-grid opacity
    show_preview = signal(false);

    // shows the window creation menu, the window will be created in this space
    new_window_space = signal(Rect.null());

    ignored_pointer_events = new WeakSet<PointerEvent>();
    ignore_next_context_menu = false;

    context_location = signal(Rect.null());
    context_component = signal<MainViewContextComponent | null>(null);
    context_window: LayoutModelWindow | null = null;

    // does not update this.occupied_cells
    public computeOccupiedCells(ignore: LayoutModelWindow[] = []) {
        if (!this.model) return new Uint8Array(0);
        const occupied_cells = new Uint8Array(this.geo.cols * this.geo.rows);
        this.model.windows.forEach(([, win]) => {
            if (ignore.includes(win)) return;
            const { x, y, w, h } = win;
            for (let i = x; i < x + w; i++) {
                for (let j = y; j < y + h; j++) {
                    if (i < 0 || j < 0 || i >= this.geo.cols || j >= this.geo.rows) continue;
                    occupied_cells[j * this.geo.cols + i] = 1;
                }
            }
        });
        return occupied_cells;
    }

    // clears the occupied cells cache (called when the geometry changes)
    public clearOccupiedCells() {
        this.occupied_cells = new Uint8Array(0);
    }

    public getOccupied(): Uint8Array {
        if (this.occupied_cells.length === 0) {
            this.occupied_cells = this.computeOccupiedCells();
        }
        return this.occupied_cells;
    }

    public max_rect(pos: Vec2): Rect {
        const { x, y } = pos;
        const cols = this.geo.cols;
        const rows = this.geo.rows;
        const occupied = this.getOccupied();
        let max_w = 0;
        let max_h = 0;

        for (let w = 1; w <= cols - x; w++) {
            for (let h = 1; h <= rows - y; h++) {
                let fits = true;
                for (let i = x; i < x + w && fits; i++) {
                    for (let j = y; j < y + h && fits; j++) {
                        if (occupied[j * cols + i]) {
                            fits = false;
                        }
                    }
                }
                if (fits) {
                    if (w * h > max_w * max_h) {
                        max_w = w;
                        max_h = h;
                    }
                } else {
                    break;
                }
            }
        }
        return new Rect(x, y, max_w, max_h);
    }

    public is_unoccupied(r: Rect, occupied: Uint8Array = this.getOccupied()): boolean {
        const cols = this.geo.cols;
        for (let i = r.x; i < r.x + r.w; i++) {
            for (let j = r.y; j < r.y + r.h; j++) {
                if (i < 0 || j < 0 || i >= cols || j * cols + i >= occupied.length || occupied[j * cols + i]) {
                    return false;
                }
            }
        }
        return true;
    }

    public pointerEvent2GridPos(e: MouseEvent): Vec2 {
        if (!this.root_rect) return new Vec2(0, 0);
        const area_x = e.clientX - this.root_rect.left;
        const area_y = e.clientY - this.root_rect.top;
        return new Vec2(Math.floor(area_x / this.geo.col_size), Math.floor(area_y / this.geo.row_size));
    }
}

export function WBLayout(p: {
    onGridUpdate: (geo: GridGeometryInfo) => void;
}) {
    const root = useRef<HTMLDivElement>(null);
    const width = useSignal(0);
    const height = useSignal(0);
    const state: WBLayoutState = useMemo(() => new WBLayoutState(), []);

    useRegistrationUpdate();

    useEffect(() => {
        if (root.current) {
            const observer = new ResizeObserver(() => {
                const rect = root.current?.getBoundingClientRect();
                if (!rect) return;
                width.value = rect.width;
                height.value = rect.height;
                state.root_rect = rect;
            });
            observer.observe(root.current);

            const pointerup = (ev: PointerEvent) => {
                if (!state.ignored_pointer_events.has(ev)) {
                    state.pointer_down_point.value = new Vec2(-1, -1);
                    state.show_preview.value = false;
                    state.pointer_mode.value = WBPointerMode.None;
                    state.target_window = null;
                    state.context_component.value = null;
                    state.context_location.value = Rect.null();
                }
            };
            addEventListener("pointerup", pointerup);
            return () => {
                observer.disconnect();
                removeEventListener("pointerup", pointerup);
            };
        } else {
            console.error("Root element is not set");
        }
    }, []);

    useMemo(() => {
        // update grid geometry on size change
        const geo = GridGeometryInfo.compute(width.value, height.value);
        state.geo = geo;
        state.clearOccupiedCells();
        p.onGridUpdate(geo);
        return geo;
    }, [width.value, height.value]);

    const [layout, updateLayout] = useLayoutModel();

    state.model = layout;
    state.model_update = updateLayout;

    const ContextComponent = state.context_component.value ?? (() => <></>);

    return (
        <div
            class={`size-full overflow-hidden absolute select-none`}
            ref={root}
        >
            <div
                class={`size-full overflow-hidden absolute`}
                onPointerMove={(e) => {
                    const pos = state.pointerEvent2GridPos(e);
                    if (!pos.eq(state.pointer.value)) {
                        state.pointer.value = pos;
                    }
                }}
                onPointerDown={(ev) => {
                    const pos = state.pointerEvent2GridPos(ev);
                    state.pointer_down_point.value = pos;
                }}
                onPointerUp={(ev) => {
                    state.pointer_mode.value = WBPointerMode.None;
                    state.target_window = null;
                    const pos = state.pointerEvent2GridPos(ev);
                    if (!pos.eq(state.pointer_down_point.value) && !state.pointer_down_point.value.eq(new Vec2(-1, -1))) {
                        const r = Rect.from_start_end(state.pointer_down_point.value, pos).fill_end();
                        if (state.is_unoccupied(r)) {
                            state.preview.value = r;
                            state.show_preview.value = true;
                            state.new_window_space.value = r;
                        }
                    }
                }}
                onDblClick={(ev) => {
                    const pos = state.pointerEvent2GridPos(ev);
                    const r = state.max_rect(pos);
                    if (r.w > 0 && r.h > 0) {
                        state.preview.value = r;
                        state.show_preview.value = true;
                        state.new_window_space.value = r;
                    }
                }}
            >
                <GridGeometryContext.Provider value={state.geo}>
                    <BgCanvas
                        opacity={state.show_preview.value ? 1 : 0.2}
                        onPointerDown={() => {
                            state.pointer_mode.value = WBPointerMode.New;
                            state.new_window_space.value = Rect.null();
                            state.preview.value = Rect.from_base_size(state.pointer.value, Vec2.null());
                            state.show_preview.value = false;
                        }}
                    />

                    <WBPos {...state.preview.value} padding={10} class={`transition-all`}>
                        <div class={`size-full ${state.show_preview.value ? `bg-brand` : "bg-transparent"} transition-colors rounded-lg`}></div>
                    </WBPos>

                    {layout?.windows.map(([id, win]) => {
                        const { x, y, w, h, type } = win;
                        const pos = new Vec2(x, y);
                        const size = new Vec2(w, h);
                        const size_limited = pos.add(size).min(new Vec2(state.geo.cols, state.geo.rows)).sub(pos);
                        const view = $pub_crate$_main_views.get(type);
                        if (!view) {
                            return (
                                <WBPos x={x} y={y} h={h} w={w} padding={1} class={`transition-none`}>
                                    <div class={`size-full bg-red-500 rounded-lg text-black flex items-center justify-center`}>Unknown View</div>
                                </WBPos>
                            );
                        }
                        const Component = view.component;
                        return (
                            <WBPos
                                key={id}
                                x={x}
                                y={y}
                                w={size_limited.x}
                                h={size_limited.y}
                                padding={-2}
                                class={`transition-none`}
                            >
                                <Component
                                    x={x}
                                    y={y}
                                    h={h}
                                    w={w}
                                    id={id}
                                    onMovePointerDown={() => {
                                        state.pointer_mode.value = WBPointerMode.Move;
                                        state.target_window = win;
                                    }}
                                    onResizePointerDown={() => {
                                        state.pointer_mode.value = WBPointerMode.Resize;
                                        state.target_window = win;
                                    }}
                                    onContextMenu={() => {
                                        if (state.ignore_next_context_menu) {
                                            state.ignore_next_context_menu = false;
                                            return;
                                        }
                                        const win_loc = new Rect(x, y, w, h);
                                        state.context_location.value = contextMenuPosition(
                                            new Vec2(state.geo.cols, state.geo.rows),
                                            win_loc,
                                            new Vec2(4, 3),
                                        );
                                        state.context_component.value = view.contextMenu;
                                        state.context_window = win;
                                    }}
                                />
                            </WBPos>
                        );
                    })}

                    <WBPos {...state.context_location.value} padding={0} class={`transition-size`}>
                        <div class={`size-full`} onPointerUp={(ev) => state.ignored_pointer_events.add(ev)}>
                            <ContextComponent
                                close_window={() => {
                                    // console.log("Close Window");
                                    state.model!.windows = state.model!.windows.filter(([, win]) => win !== state.context_window);
                                    // console.log(state.model!.windows);
                                    state.model_update();
                                    state.clearOccupiedCells();
                                    state.context_component.value = null;
                                    state.context_location.value = Rect.null();
                                }}
                                close_context_menu={() => {
                                    state.context_component.value = null;
                                    state.context_location.value = Rect.null();
                                }}
                            />
                        </div>
                    </WBPos>
                </GridGeometryContext.Provider>
            </div>
            <div
                class={`absolute size-full ${
                    !state.new_window_space.value.eq(Rect.null()) ? `opacity-100` : `pointer-events-none opacity-0`
                } transition-opacity bg-stone-800 bg-opacity-35 p-20`}
                onClick={() => {
                    state.show_preview.value = false;
                    state.new_window_space.value = Rect.null();
                }}
            >
                <div class={`size-full bg-bg-800 overflow-auto p-4`}>
                    <div class={`w-full flex flex-row justify-center flex-wrap gap-2`}>
                        {[...$pub_crate$_main_views.values()].map((view) => (
                            <div
                                class={`flex flex-col items-center justify-center text-xl h-28 w-32 bg-red-500`}
                                onClick={() => {
                                    layout?.windows.push([crypto.randomUUID(), { ...state.new_window_space.value, type: view.id }]);
                                    updateLayout();
                                }}
                            >
                                <div class={`text-3xl`}>
                                    <Ms>{view.icon}</Ms>
                                </div>
                                <span>{view.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function WBPos(p: {
    children: ComponentChildren;
    x: number;
    y: number;
    h: number;
    w: number;
    padding: number;

    class?: string;
}) {
    const geo = useContext(GridGeometryContext);
    return (
        <div
            class={`absolute ${p.class} overflow-hidden pointer-events-none`}
            style={{
                left: geo.col_size * p.x + p.padding,
                top: geo.row_size * p.y + p.padding,
                width: geo.col_size * p.w - 2 * p.padding - 1,
                height: geo.row_size * p.h - 2 * p.padding - 1,
            }}
        >
            <div
                class={`absolute overflow-hidden`}
                style={{
                    width: geo.col_size * p.w - 2 * p.padding - 1,
                    height: geo.row_size * p.h - 2 * p.padding - 1,
                }}
            >
                {p.children}
            </div>
        </div>
    );
}

function TestComponent(
    p: MainViewComponentProps & {
        color: string;
        name: string;
    },
) {
    return (
        <div
            class={`size-full bg-bg-800 grid rounded-lg overflow-hidden relative pointer-events-auto border-4 border-bg-700`}
            style={{
                gridTemplateColumns: `repeat(${p.w}, 1fr)`,
                gridTemplateRows: `repeat(${p.h}, 1fr)`,
            }}
        >
            <div class={`${p.color} relative overflow-hidden`} onPointerDown={p.onMovePointerDown} onClick={p.onContextMenu}>
                <div class={`text-black p-2 font-semibold text-xl`}>{p.name}</div>
            </div>
            {Array.from({ length: p.w * p.h - 1 }).map((_, i) => (
                <div class={`relative overflow-hidden border border-black`}>
                    <div class={`absolute`}>{i + 1}</div>
                    {/* <div class={`absolute right-0 h-full w-2 bg-bg-600`}> */}
                    {/* <div class={`w-full absolute bottom-0 bg-green-700 h-1/2`}></div> */}
                    {/* </div> */}
                </div>
            ))}
            <div
                class={`absolute bg-neutral-500 bg-opacity-50 bottom-0 right-0 translate-x-1/2 translate-y-1/2 rotate-45 size-14`}
                onPointerDown={p.onResizePointerDown}
            >
            </div>
        </div>
    );
}

function TestContextMenu(p: MainViewContextComponentProps) {
    return (
        <div class={`size-full pointer-events-auto p-3 absolute`}>
            <div class={`bg-bg-700 size-full bg-opacity-80 rounded-lg flex flex-col border border-accent overflow-hidden`}>
                <div class={`basis-11 bg-bg-800 flex flex-row items-stretch`}>
                    <div class={`grow`}></div>
                    <div class={`basis-20 bg-red-700 flex flex-row items-center justify-center`} onClick={p.close_window}>Close</div>
                    <div class={`basis-10 flex flex-row items-center justify-center`} onClick={p.close_context_menu}>X</div>
                </div>
            </div>
        </div>
    );
}

registerMainView({
    id: "test",
    name: "Subs",
    icon: "category",
    component: (p) => <TestComponent {...p} color="bg-amber-500" name="Subs" />,
    contextMenu: TestContextMenu,
});

registerMainView({
    id: "test2",
    name: "Presets",
    icon: "category",
    component: (p) => <TestComponent {...p} color="bg-green-600" name="Presets" />,
    contextMenu: TestContextMenu,
});

registerMainView({
    id: "test3",
    name: "Groups",
    icon: "category",
    component: (p) => <TestComponent {...p} color="bg-violet-500" name="Groups" />,
    contextMenu: TestContextMenu,
});

registerMainView({
    id: "test4",
    name: "ColorPalettes",
    icon: "category",
    component: (p) => <TestComponent {...p} color="bg-blue-500" name="ColorPalettes" />,
    contextMenu: TestContextMenu,
});

registerMainView({
    id: "logs",
    name: "Logs",
    icon: "terminal",
    component: (p) => {
        return (
            <div className={`rounded-lg overflow-hidden relative pointer-events-auto border-4 border-bg-700 bg-bg-700 size-full flex flex-col`}>
                <div
                    class={`basis-10 bg-bg-900 border-b border-accent flex flex-row items-center px-4`}
                    onPointerDown={p.onMovePointerDown}
                    onClick={p.onContextMenu}
                >
                    Terminal
                </div>
                <LogPage />
                <div
                    class={`absolute bg-neutral-500 bg-opacity-50 bottom-0 right-0 translate-x-1/2 translate-y-1/2 rotate-45 size-14`}
                    onPointerDown={p.onResizePointerDown}
                >
                </div>
            </div>
        );
    },
    contextMenu: TestContextMenu,
});
