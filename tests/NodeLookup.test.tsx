// @vitest-environment jsdom
import * as React from "react";
import { act, render, waitFor } from "@testing-library/react";
import { Actions, BorderNode, IJsonModel, ILayoutApi, Layout, Model, TabNode, TabSetNode } from "../src";

const factory = (node: TabNode) => <div>content for {node.getName()}</div>;

const json: IJsonModel = {
    global: {},
    borders: [
        {
            type: "border",
            location: "left",
            children: [{ type: "tab", id: "b0", name: "Border Tab" }],
        },
    ],
    layout: {
        type: "row",
        children: [
            {
                type: "tabset",
                id: "ts0",
                children: [
                    { type: "tab", id: "my tab", name: "Spaced" },
                    { type: "tab", id: "t1", name: "Lazy" },
                ],
            },
            {
                type: "tabset",
                id: "ts1",
                children: [{ type: "tab", id: "t2", name: "Other" }],
            },
        ],
    },
};

const renderLayout = () => {
    const model = Model.fromJson(json);
    const ref = React.createRef<ILayoutApi>();
    render(<Layout model={model} factory={factory} ref={ref} />);
    return { model, api: ref.current! };
};

const path = (layoutPath: string) => document.querySelector<HTMLElement>(`[data-layout-path="${layoutPath}"]`)!;

// jsdom has no layout, so the factory content is not rendered: stand in for it inside the panel
const contentIn = (panel: HTMLElement) => panel.appendChild(document.createElement("div")).appendChild(document.createElement("span"));

describe("node lookup through the layout ref", () => {
    it("finds a tab's button and panel, including for ids with whitespace", () => {
        const { model, api } = renderLayout();
        const tab = model.getNodeById("my tab") as TabNode;
        expect(api.getElementForNode("my tab")).toBe(path("/ts0/tb0"));
        expect(api.getElementForNode(tab, "button")).toBe(path("/ts0/tb0"));
        expect(api.getElementForNode(tab, "panel")).toBe(path("/ts0/t0"));
    });

    it("finds a tabset's element and a border's tab bar", () => {
        const { api } = renderLayout();
        expect(api.getElementForNode("ts1")).toBe(path("/ts1"));
        expect(api.getElementForNode("border_left")).toBe(path("/border/left"));
    });

    it("returns undefined for unknown ids, rows and tabs not rendered yet", () => {
        const { model, api } = renderLayout();
        expect(api.getElementForNode("missing")).toBeUndefined();
        expect(api.getElementForNode(model.getRootRow()!)).toBeUndefined();
        expect(api.getElementForNode("t1", "button")).toBe(path("/ts0/tb1"));
        expect(api.getElementForNode("t1", "panel")).toBeUndefined();
        expect(api.getElementForNode("b0", "panel")).toBeUndefined();
    });

    it("finds the tab whose button or content holds an element", () => {
        const { model, api } = renderLayout();
        const tab = model.getNodeById("my tab");
        expect(api.getNodeForElement(path("/ts0/tb0"))).toBe(tab);
        expect(api.getNodeForElement(path("/ts0/tb0").firstElementChild!)).toBe(tab);
        expect(api.getNodeForElement(contentIn(path("/ts0/t0")))).toBe(tab);
        expect(api.getNodeForElement(contentIn(path("/ts1/t0")))).toBe(model.getNodeById("t2"));
        expect(api.getNodeForElement(path("/border/left/tb0"))).toBe(model.getNodeById("b0"));
    });

    it("finds the tabset or border whose element holds an element outside the tab buttons", () => {
        const { model, api } = renderLayout();
        expect(api.getNodeForElement(path("/ts1")) as TabSetNode).toBe(model.getNodeById("ts1"));
        expect(api.getNodeForElement(path("/ts1/button/max"))).toBe(model.getNodeById("ts1"));
        expect(api.getNodeForElement(path("/ts1/tabstrip"))).toBe(model.getNodeById("ts1"));
        expect(api.getNodeForElement(path("/border/left")) as BorderNode).toBe(model.getNodeById("border_left"));
    });

    it("returns undefined for elements outside the tabs, tabsets and borders", () => {
        const { api } = renderLayout();
        expect(api.getNodeForElement(path("/s0"))).toBeUndefined();
        expect(api.getNodeForElement(api.getRootDiv()!)).toBeUndefined();
        expect(api.getNodeForElement(document.body)).toBeUndefined();
    });

    it("follows a tab into a floating panel", async () => {
        const model = Model.fromJson(json);
        const ref = React.createRef<ILayoutApi>();
        render(<Layout model={model} factory={factory} ref={ref} />);
        act(() => {
            model.doAction(Actions.popoutTab("t2", "float"));
        });
        act(() => {
            ref.current!.redraw();
        });
        const tab = model.getNodeById("t2") as TabNode;
        await waitFor(() => expect(ref.current!.getElementForNode(tab, "panel")).toBeDefined());
        expect(tab.getLayoutId()).not.toBe(model.getMainLayout().getLayoutId());
        const button = ref.current!.getElementForNode(tab)!;
        expect(button.getAttribute("aria-label")).toBe("Other");
        expect(ref.current!.getNodeForElement(button)).toBe(tab);
        expect(ref.current!.getNodeForElement(contentIn(ref.current!.getElementForNode(tab, "panel")!))).toBe(tab);
        const tabset = ref.current!.getElementForNode(tab.getParent()!)!;
        expect(tabset.classList.contains("flexlayout__tabset")).toBe(true);
        expect(ref.current!.getNodeForElement(tabset)).toBe(tab.getParent());
    });
});
