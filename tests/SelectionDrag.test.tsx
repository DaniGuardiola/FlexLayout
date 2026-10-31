// @vitest-environment jsdom
import * as React from "react";
import { act, createEvent, fireEvent, render } from "@testing-library/react";
import { DropInfo, IJsonModel, IJsonTabNode, ILayoutApi, Layout, Model, Node, TabNode, TabSetNode } from "../src";

// drags in jsdom: every element measures 100x100 at the origin, so a drop at the center of the
// layout lands in the center of the first tabset (ts0), appending the dragged tabs

const factory = (node: TabNode) => <div>content for {node.getName()}</div>;

const json = (ts1Tabs: IJsonTabNode[]): IJsonModel => ({
    global: {},
    layout: {
        type: "row",
        children: [
            {
                type: "tabset",
                id: "ts0",
                children: [
                    { type: "tab", id: "t0", name: "T0" },
                    { type: "tab", id: "t1", name: "T1" },
                ],
            },
            { type: "tabset", id: "ts1", children: ts1Tabs },
        ],
    },
});

const renderLayout = (model: Model) => {
    const ref = React.createRef<ILayoutApi>();
    render(<Layout model={model} factory={factory} ref={ref} tabSelection={true} />);
    return ref;
};

const button = (path: string) => document.body.querySelector(`[data-layout-path="${path}"]`) as HTMLElement;
const tabIds = (model: Model, id: string) => (model.getNodeById(id) as TabSetNode).getTabNodes().map((tab) => tab.getId());

const dragToFirstTabset = (path: string) => {
    const dataTransfer = { setData: vi.fn(), setDragImage: vi.fn(), effectAllowed: "", dropEffect: "" };
    const source = button(path);
    const layout = source.closest(".flexlayout__layout")!;
    // jsdom has no DragEvent, so the pointer position is set on the created events
    const fireAtCenter = (type: "dragEnter" | "dragOver" | "drop") => {
        const event = createEvent[type](layout, { dataTransfer });
        Object.defineProperties(event, { clientX: { value: 50 }, clientY: { value: 50 } });
        fireEvent(layout, event);
    };
    fireEvent.dragStart(source, { dataTransfer });
    fireAtCenter("dragEnter");
    fireAtCenter("dragOver");
    act(() => fireAtCenter("drop"));
    fireEvent.dragEnd(source);
};

describe("dragging a tab selection", () => {
    it("moves the whole selection", () => {
        const model = Model.fromJson(
            json([
                { type: "tab", id: "t2", name: "T2" },
                { type: "tab", id: "t3", name: "T3" },
                { type: "tab", id: "t4", name: "T4" },
            ]),
        );
        const ref = renderLayout(model);
        act(() => ref.current!.setSelectedTabIds(["t2", "t4"]));
        dragToFirstTabset("/ts1/tb2");
        expect(tabIds(model, "ts0")).toEqual(["t0", "t1", "t2", "t4"]);
        expect(tabIds(model, "ts1")).toEqual(["t3"]);
    });

    it("leaves selected tabs that cannot be dragged where they are", () => {
        const model = Model.fromJson(
            json([
                { type: "tab", id: "t2", name: "T2", enableDrag: false },
                { type: "tab", id: "t3", name: "T3" },
                { type: "tab", id: "t4", name: "T4" },
            ]),
        );
        const ref = renderLayout(model);
        act(() => ref.current!.setSelectedTabIds(["t2", "t4"]));
        dragToFirstTabset("/ts1/tb2");
        expect(tabIds(model, "ts0")).toEqual(["t0", "t1", "t4"]);
        expect(tabIds(model, "ts1")).toEqual(["t2", "t3"]);
    });

    it("does not drop where onAllowDrop refuses one of the selected tabs", () => {
        const model = Model.fromJson(
            json([
                { type: "tab", id: "t2", name: "T2" },
                { type: "tab", id: "t3", name: "T3" },
                { type: "tab", id: "t4", name: "T4" },
            ]),
        );
        const onAllowDrop = vi.fn((dragNode: Node, dropInfo: DropInfo) => !(dragNode.getId() === "t4" && dropInfo.node.getId() === "ts0"));
        model.setOnAllowDrop(onAllowDrop);
        const ref = renderLayout(model);
        act(() => ref.current!.setSelectedTabIds(["t2", "t4"]));
        dragToFirstTabset("/ts1/tb0");
        expect(onAllowDrop).toHaveBeenCalledWith(model.getNodeById("t2"), expect.objectContaining({ node: model.getNodeById("ts0") }));
        expect(onAllowDrop).toHaveBeenCalledWith(model.getNodeById("t4"), expect.objectContaining({ node: model.getNodeById("ts0") }));
        expect(tabIds(model, "ts0")).toEqual(["t0", "t1"]);
        expect(tabIds(model, "ts1")).toEqual(["t2", "t3", "t4"]);
    });

    it("does not move a selected pinned tab out of its tabset", () => {
        const model = Model.fromJson(
            json([
                { type: "tab", id: "t2", name: "T2", pinned: true },
                { type: "tab", id: "t3", name: "T3" },
                { type: "tab", id: "t4", name: "T4" },
            ]),
        );
        const ref = renderLayout(model);
        act(() => ref.current!.setSelectedTabIds(["t2", "t4"]));
        dragToFirstTabset("/ts1/tb2");
        expect(tabIds(model, "ts0")).toEqual(["t0", "t1"]);
        expect(tabIds(model, "ts1")).toEqual(["t2", "t3", "t4"]);
    });
});
