// @vitest-environment jsdom
import * as React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { IJsonModel, Layout, Model, TabNode } from "../src";

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

const renderLayout = (props: Partial<React.ComponentProps<typeof Layout>> = {}) => {
    const model = Model.fromJson(json);
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
        expect(press("Tab")).toBe(false);
        expect(press("F6")).toBe(false);
        expect(tab("t0")).toHaveAttribute("tabindex", "0");
        expect(tab("t3")).toHaveAttribute("tabindex", "0");
        expect(path("/area-start")).toBeNull();
    });

    it("moves Tab / Shift+Tab between the areas' shown tabs: tabsets in layout order, then borders", () => {
        renderLayout();
        focus(tab("t0"));
        expect(press("Tab")).toBe(true);
        expect(tab("t3")).toHaveFocus();
        press("Tab");
        expect(tab("t4")).toHaveFocus();
        // a collapsed border is a stop on its first tab
        press("Tab");
        expect(tab("b0")).toHaveFocus();
        press("Tab", { shiftKey: true });
        expect(tab("t4")).toHaveFocus();
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
        expect(tab("t3")).toHaveFocus();

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
        expect(tab("t4")).toHaveFocus();
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

    it("advertises the area keys", () => {
        renderLayout();
        expect(tab("t0").getAttribute("aria-keyshortcuts")).toMatch(/^Enter Control\+Delete F2 /);
        expect(panel("t0")).toHaveAttribute("aria-keyshortcuts", "Escape F6 Shift+F6");
        expect(tab("t0").closest('[role="tablist"]')).toHaveAttribute("aria-keyshortcuts", "F6 Shift+F6");
        expect(tab("b0").closest('[role="tablist"]')).toHaveAttribute("aria-keyshortcuts", "F6 Shift+F6");
    });
});
