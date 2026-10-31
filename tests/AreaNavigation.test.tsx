// @vitest-environment jsdom
import * as React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { Actions, BorderNode, IJsonModel, Layout, Model, TabNode, TabSetNode } from "../src";
import { getTabbableElements } from "../src/view/Utils";

const factory = (node: TabNode) =>
    node.getConfig()?.form ? (
        <div>
            <input aria-label={node.getName() + " field"} />
            <button>{node.getName() + " button"}</button>
            <button onKeyDown={(event) => event.key === "Escape" && event.preventDefault()}>{node.getName() + " menu"}</button>
        </div>
    ) : (
        <div>content for {node.getName()}</div>
    );

const json: IJsonModel = {
    global: { tabEnableRename: true },
    borders: [
        {
            type: "border",
            location: "bottom",
            children: [
                { type: "tab", id: "b0", name: "B0", component: "c", config: { form: true } },
                { type: "tab", id: "b1", name: "B1", component: "c" },
            ],
        },
    ],
    layout: {
        type: "row",
        children: [
            {
                type: "tabset",
                id: "ts0",
                children: [
                    { type: "tab", id: "t0", name: "T0", component: "c", config: { form: true } },
                    { type: "tab", id: "t1", name: "T1", component: "c" },
                    { type: "tab", id: "t2", name: "T2", component: "c" },
                ],
            },
            {
                type: "row",
                children: [
                    { type: "tabset", id: "ts1", children: [{ type: "tab", id: "t3", name: "T3", component: "c" }] },
                    { type: "tabset", id: "ts2", children: [{ type: "tab", id: "t4", name: "T4", component: "c" }] },
                ],
            },
        ],
    },
};

const renderLayout = (props: Partial<React.ComponentProps<typeof Layout>> = {}, layoutJson: IJsonModel = json) => {
    const model = Model.fromJson(layoutJson);
    render(
        <>
            <button>before</button>
            <Layout model={model} factory={factory} tabNavigation="areas" {...props} />
            <button>after</button>
        </>,
    );
    return { model };
};

const tab = (id: string) => document.getElementById("flexlayout-tabbutton-" + id) as HTMLElement;
const panel = (id: string) => document.getElementById("flexlayout-tab-" + id) as HTMLElement;
const byLabel = (label: string) => document.querySelector(`[aria-label="${label}"]`) as HTMLElement;
const byText = (text: string) => Array.from(document.querySelectorAll("button")).find((button) => button.textContent === text) as HTMLElement;
const path = (layoutPath: string) => document.querySelector(`[data-layout-path="${layoutPath}"]`) as HTMLElement;

// presses a key on the focused element, returning whether the layout handled it
const press = (key: string, init: KeyboardEventInit = {}) => !fireEvent.keyDown(document.activeElement!, { key, ...init });

const focus = (element: HTMLElement) => act(() => element.focus());

describe("area navigation", () => {
    it("leaves Tab alone with the default dom navigation", () => {
        renderLayout({ tabNavigation: undefined });
        focus(tab("t0"));
        const setTimeout = vi.spyOn(window, "setTimeout");
        try {
            expect(press("Tab")).toBe(false);
            expect(setTimeout).not.toHaveBeenCalled();
        } finally {
            setTimeout.mockRestore();
        }
        expect(press("F6")).toBe(false);
        expect(tab("t0")).toHaveAttribute("tabindex", "0");
        expect(tab("t3")).toHaveAttribute("tabindex", "0");
        expect(path("/area-start")).toBeNull();
    });

    it("moves Tab / Shift+Tab between the areas' shown tabs and the splitters between them: tabsets in layout order, then borders", () => {
        renderLayout();
        focus(tab("t0"));
        expect(press("Tab")).toBe(true);
        expect(path("/s0")).toHaveFocus();
        press("Tab");
        expect(tab("t3")).toHaveFocus();
        press("Tab");
        expect(path("/r1/s0")).toHaveFocus();
        press("Tab");
        expect(tab("t4")).toHaveFocus();
        // a collapsed border is a stop on its first tab
        press("Tab");
        expect(tab("b0")).toHaveFocus();
        press("Tab", { shiftKey: true });
        expect(tab("t4")).toHaveFocus();
        press("Tab", { shiftKey: true });
        expect(path("/r1/s0")).toHaveFocus();
    });

    it("keeps arrow keys resizing on a splitter and moves on from it with Tab, Shift+Tab and F6", () => {
        const { model } = renderLayout();
        focus(path("/s0"));
        const tabset = model.getNodeById("ts0") as TabSetNode;
        const weight = tabset.getWeight();
        expect(press("ArrowRight")).toBe(true);
        expect(tabset.getWeight()).not.toBe(weight);
        expect(path("/s0")).toHaveFocus();
        press("Tab");
        expect(tab("t3")).toHaveFocus();
        focus(path("/s0"));
        press("Tab", { shiftKey: true });
        expect(tab("t0")).toHaveFocus();
        focus(path("/r1/s0"));
        press("F6");
        expect(tab("t4")).toHaveFocus();
        focus(path("/r1/s0"));
        press("F6", { shiftKey: true });
        expect(tab("t3")).toHaveFocus();
    });

    it("stops on an open border's splitter before the border", async () => {
        const { model } = renderLayout();
        act(() => {
            model.doAction(Actions.selectTab("b1"));
        });
        const splitter = await waitFor(() => path("/border/bottom/s-1") ?? Promise.reject(new Error("no splitter")));
        focus(tab("t4"));
        press("Tab");
        expect(splitter).toHaveFocus();
        press("Tab");
        expect(tab("b1")).toHaveFocus();
    });

    it("cycles only the maximized tabset while one is maximized", () => {
        const { model } = renderLayout();
        act(() => {
            model.doAction(Actions.maximizeToggle("ts1"));
        });
        focus(tab("t3"));
        press("Tab");
        expect(tab("b0")).toHaveFocus();
        press("Tab", { shiftKey: true });
        expect(tab("t3")).toHaveFocus();
        press("Tab", { shiftKey: true });
        expect(path("/area-start")).toHaveFocus();
        focus(tab("b0"));
        press("F6");
        expect(tab("t3")).toHaveFocus();
    });

    it("keeps focus on the tabset's shown tab when maximizing and restoring it", () => {
        const { model } = renderLayout();
        focus(tab("t3"));
        act(() => {
            model.doAction(Actions.maximizeToggle("ts1"));
        });
        expect(model.getMaximizedTabset()?.getId()).toBe("ts1");
        expect(tab("t3")).toHaveFocus();
        act(() => {
            model.doAction(Actions.maximizeToggle("ts1"));
        });
        expect(model.getMaximizedTabset()).toBeUndefined();
        expect(tab("t3")).toHaveFocus();

        // the toolbar button and a double-click on the tab strip
        focus(path("/r1/ts0/button/max"));
        fireEvent.click(path("/r1/ts0/button/max"));
        expect(model.getMaximizedTabset()?.getId()).toBe("ts1");
        expect(tab("t3")).toHaveFocus();
        fireEvent.doubleClick(path("/r1/ts0/tabstrip"));
        expect(model.getMaximizedTabset()).toBeUndefined();
        expect(tab("t3")).toHaveFocus();
    });

    it("leaves focus alone when maximizing a tabset that does not hold it", async () => {
        const { model } = renderLayout();
        await waitFor(() => expect(byLabel("T0 field")).not.toBeNull());
        focus(byLabel("T0 field"));
        act(() => {
            model.doAction(Actions.maximizeToggle("ts0"));
        });
        expect(byLabel("T0 field")).toHaveFocus();
    });

    it("leaves past the last and first stops from a sentinel, letting the browser move on", () => {
        renderLayout();
        focus(tab("b0"));
        expect(press("Tab")).toBe(false);
        expect(path("/area-end")).toHaveFocus();
        focus(tab("t0"));
        expect(press("Tab", { shiftKey: true })).toBe(false);
        expect(path("/area-start")).toHaveFocus();
    });

    it("keeps only the current area's tab in the Tab sequence", async () => {
        renderLayout();
        expect(tab("t0")).toHaveAttribute("tabindex", "0");
        expect(tab("t3")).toHaveAttribute("tabindex", "-1");
        expect(tab("b0")).toHaveAttribute("tabindex", "-1");
        focus(tab("t3"));
        await waitFor(() => expect(tab("t3")).toHaveAttribute("tabindex", "0"));
        expect(tab("t0")).toHaveAttribute("tabindex", "-1");
    });

    it("enters the layout with Tab on the area that last had focus", async () => {
        renderLayout();
        const before = byText("before");
        const maximize = path("/ts0/button/max");
        focus(before);
        press("Tab");
        focus(maximize);
        expect(tab("t0")).toHaveFocus();

        focus(tab("t4"));
        await waitFor(() => expect(tab("t4")).toHaveAttribute("tabindex", "0"));
        focus(byText("after"));
        press("Tab", { shiftKey: true });
        focus(maximize);
        expect(tab("t4")).toHaveFocus();
    });

    it("does not redirect focus moved into the layout by other means", async () => {
        renderLayout();
        focus(byText("before"));
        await new Promise((resolve) => setTimeout(resolve));
        const maximize = path("/ts0/button/max");
        focus(maximize);
        expect(maximize).toHaveFocus();
    });

    it("enters content with Enter, leaves it with Tab past the end, Shift+Tab before the start and Escape", async () => {
        renderLayout();
        await waitFor(() => expect(byLabel("T0 field")).not.toBeNull());
        focus(tab("t0"));
        expect(press("Enter")).toBe(true);
        expect(byLabel("T0 field")).toHaveFocus();
        expect(press("Tab")).toBe(false);
        expect(press("Tab", { shiftKey: true })).toBe(true);
        expect(tab("t0")).toHaveFocus();

        focus(byText("T0 menu"));
        expect(press("Tab")).toBe(true);
        expect(path("/s0")).toHaveFocus();

        focus(byText("T0 button"));
        expect(press("Escape")).toBe(true);
        expect(tab("t0")).toHaveFocus();
    });

    it("leaves Escape to content that handles it", async () => {
        renderLayout();
        await waitFor(() => expect(byText("T0 menu")).toBeDefined());
        focus(byText("T0 menu"));
        press("Escape");
        expect(byText("T0 menu")).toHaveFocus();
    });

    it("focuses the content itself when it has nothing focusable", () => {
        renderLayout();
        focus(tab("t3"));
        press("Enter");
        expect(panel("t3")).toHaveFocus();
        press("Tab");
        expect(path("/r1/s0")).toHaveFocus();
    });

    it("opens a collapsed border with Enter and moves into its content", async () => {
        const { model } = renderLayout();
        focus(tab("b0"));
        press("Enter");
        expect(model.getBorderSet().getBorders()[0].getSelected()).toBe(0);
        await waitFor(() => expect(byLabel("B0 field")).toHaveFocus());
    });

    it("cycles the areas with F6 / Shift+F6 from tabs and content", async () => {
        renderLayout();
        await waitFor(() => expect(byLabel("T0 field")).not.toBeNull());
        focus(byLabel("T0 field"));
        expect(press("F6")).toBe(true);
        expect(tab("t3")).toHaveFocus();
        press("F6", { shiftKey: true });
        press("F6", { shiftKey: true });
        expect(tab("b0")).toHaveFocus();
        press("F6");
        expect(tab("t0")).toHaveFocus();
    });

    it("takes the area keys from the keyMap", async () => {
        renderLayout({ keyMap: { nextArea: "Ctrl+F6", previousArea: undefined, enterArea: "Alt+Enter", exitArea: "F10" } });
        await waitFor(() => expect(byLabel("T0 field")).not.toBeNull());
        focus(tab("t0"));
        expect(press("F6")).toBe(false);
        expect(press("F6", { shiftKey: true })).toBe(false);
        press("F6", { ctrlKey: true });
        expect(tab("t3")).toHaveFocus();
        focus(tab("t0"));
        press("Enter", { altKey: true });
        expect(byLabel("T0 field")).toHaveFocus();
        expect(press("Escape")).toBe(false);
        press("F10");
        expect(tab("t0")).toHaveFocus();
    });

    it("moves to the first and last tab of a strip with Home / End", () => {
        renderLayout();
        focus(tab("t0"));
        press("End");
        expect(tab("t2")).toHaveFocus();
        press("Home");
        expect(tab("t0")).toHaveFocus();
    });

    it("keeps F2 rename, without taking over Tab in the rename textbox", async () => {
        renderLayout();
        focus(tab("t0"));
        press("F2");
        const textbox = await waitFor(() => path("/ts0/tb0/textbox") ?? Promise.reject(new Error("no textbox")));
        focus(textbox);
        expect(press("Tab")).toBe(false);
    });

    it("stops on the toolbar of a shown border without tabs, after the areas", () => {
        const onRenderTabSet = (node: unknown, renderValues: { buttons: React.ReactNode[] }) => {
            if (node instanceof BorderNode) {
                renderValues.buttons.push(<button key="add">Add panel</button>);
            }
        };
        renderLayout(
            { onRenderTabSet },
            {
                global: {},
                borders: [{ type: "border", location: "bottom", enableAutoHide: false, children: [] }],
                layout: {
                    type: "row",
                    children: [
                        { type: "tabset", id: "ts0", children: [{ type: "tab", id: "t0", name: "T0", component: "c" }] },
                        { type: "tabset", id: "ts1", children: [{ type: "tab", id: "t1", name: "T1", component: "c" }] },
                    ],
                },
            },
        );
        focus(tab("t1"));
        press("Tab");
        expect(byText("Add panel")).toHaveFocus();
        expect(press("Tab")).toBe(false);
        expect(path("/area-end")).toHaveFocus();
        focus(byText("Add panel"));
        press("Tab", { shiftKey: true });
        expect(tab("t1")).toHaveFocus();
    });

    it("enters a tabset without a tab strip straight into its content", async () => {
        renderLayout(
            {},
            {
                global: {},
                layout: {
                    type: "row",
                    children: [
                        { type: "tabset", id: "ts0", children: [{ type: "tab", id: "t0", name: "T0", component: "c" }] },
                        { type: "tabset", id: "ts1", enableTabStrip: false, children: [{ type: "tab", id: "t1", name: "T1", component: "c", config: { form: true } }] },
                        { type: "tabset", id: "ts2", enableTabStrip: false, children: [{ type: "tab", id: "t2", name: "T2", component: "c" }] },
                    ],
                },
            },
        );
        await waitFor(() => expect(byLabel("T1 field")).not.toBeNull());
        focus(tab("t0"));
        press("Tab");
        press("Tab");
        expect(byLabel("T1 field")).toHaveFocus();
        expect(press("Tab")).toBe(false);
        focus(byText("T1 menu"));
        press("Tab");
        expect(path("/s1")).toHaveFocus();
        // nothing focusable: the panel itself is the stop
        press("Tab");
        expect(panel("t2")).toHaveFocus();
        press("Tab", { shiftKey: true });
        expect(path("/s1")).toHaveFocus();
        focus(byLabel("T1 field"));
        press("Tab", { shiftKey: true });
        expect(path("/s0")).toHaveFocus();
        // there is no tab to return to
        focus(byText("T1 button"));
        expect(press("Escape")).toBe(false);
        expect(press("F6")).toBe(true);
        expect(panel("t2")).toHaveFocus();
        press("F6", { shiftKey: true });
        expect(byLabel("T1 field")).toHaveFocus();
    });

    it("enters an empty tabset on its placeholder content", () => {
        const emptyJson: IJsonModel = {
            global: { tabSetEnableDeleteWhenEmpty: false },
            layout: {
                type: "row",
                children: [
                    { type: "tabset", id: "ts0", children: [{ type: "tab", id: "t0", name: "T0", component: "c" }] },
                    { type: "tabset", id: "ts1", children: [] },
                ],
            },
        };
        renderLayout({ onTabSetPlaceHolder: () => <button>Add a panel</button> }, emptyJson);
        focus(tab("t0"));
        press("Tab");
        press("Tab");
        expect(byText("Add a panel")).toHaveFocus();
        expect(press("Tab")).toBe(false);
        expect(path("/area-end")).toHaveFocus();
        focus(byText("Add a panel"));
        press("Tab", { shiftKey: true });
        expect(path("/s0")).toHaveFocus();
    });

    it("focuses an empty tabset's content when its placeholder has nothing focusable", () => {
        renderLayout(
            {},
            {
                global: { tabSetEnableDeleteWhenEmpty: false },
                layout: {
                    type: "row",
                    children: [
                        { type: "tabset", id: "ts0", children: [{ type: "tab", id: "t0", name: "T0", component: "c" }] },
                        { type: "tabset", id: "ts1", children: [] },
                    ],
                },
            },
        );
        focus(tab("t0"));
        press("F6");
        expect(document.activeElement).toHaveClass("flexlayout__tabset_content");
        expect(path("/ts1")).toContainElement(document.activeElement as HTMLElement);
    });

    it("does not scan the layout for keys and focus moves that stay put", async () => {
        renderLayout();
        await waitFor(() => expect(byLabel("T0 field")).not.toBeNull());
        focus(byLabel("T0 field"));
        const querySelector = vi.spyOn(Element.prototype, "querySelector");
        try {
            press("a");
            focus(byText("T0 button"));
            expect(querySelector).not.toHaveBeenCalled();
            focus(tab("t3"));
            expect(querySelector).toHaveBeenCalled();
        } finally {
            querySelector.mockRestore();
        }
    });

    it("advertises the area keys", () => {
        renderLayout();
        expect(tab("t0")).toHaveAttribute("aria-keyshortcuts", "Enter Control+Delete F2");
        expect(panel("t0")).toHaveAttribute("aria-keyshortcuts", "Escape F6 Shift+F6");
        expect(tab("t0").closest('[role="tablist"]')).toHaveAttribute("aria-keyshortcuts", "F6 Shift+F6");
        expect(tab("b0").closest('[role="tablist"]')).toHaveAttribute("aria-keyshortcuts", "F6 Shift+F6");
    });
});

describe("getTabbableElements", () => {
    it("matches the browser's Tab order: disabled fieldsets, inert and hidden elements are skipped; iframes, editing hosts and summaries are included", () => {
        const container = document.createElement("div");
        container.innerHTML = `
            <fieldset disabled><legend><button id="legend">legend</button></legend><button id="fieldset">fieldset</button></fieldset>
            <div inert><button id="inert">inert</button></div>
            <button id="hidden" style="visibility: hidden">hidden</button>
            <iframe id="frame"></iframe>
            <div id="editable" contenteditable="true"></div>
            <div id="readonly" contenteditable="false"></div>
            <div id="untabbable" contenteditable="true" tabindex="-1"></div>
            <details><summary id="summary">more</summary></details>
            <button id="disabled" disabled>disabled</button>
        `;
        document.body.appendChild(container);
        const original = HTMLElement.prototype.checkVisibility;
        HTMLElement.prototype.checkVisibility = function (this: HTMLElement, options?: CheckVisibilityOptions) {
            return !(options?.visibilityProperty && this.style.visibility === "hidden");
        };
        try {
            expect(getTabbableElements(container).map((element) => element.id)).toEqual(["legend", "frame", "editable", "summary"]);
        } finally {
            HTMLElement.prototype.checkVisibility = original;
            container.remove();
        }
    });
});
