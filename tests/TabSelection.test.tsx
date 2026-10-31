// @vitest-environment jsdom
import * as React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { Actions, IJsonModel, ILayoutApi, Layout, Model, TabNode, TabSetNode } from "../src";

const factory = (node: TabNode) => <div>content for {node.getName()}</div>;

const json: IJsonModel = {
    global: {},
    borders: [
        {
            type: "border",
            location: "left",
            children: [
                { type: "tab", id: "b0", name: "B0" },
                { type: "tab", id: "b1", name: "B1" },
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
                    { type: "tab", id: "t0", name: "T0" },
                    { type: "tab", id: "t1", name: "T1" },
                    { type: "tab", id: "t2", name: "T2" },
                    { type: "tab", id: "t3", name: "T3" },
                ],
            },
            {
                type: "tabset",
                id: "ts1",
                children: [
                    { type: "tab", id: "t4", name: "T4" },
                    { type: "tab", id: "t5", name: "T5" },
                ],
            },
        ],
    },
};

const renderLayout = (props: Partial<React.ComponentProps<typeof Layout>> = {}) => {
    const model = Model.fromJson(json);
    const ref = React.createRef<ILayoutApi>();
    const onTabSelectionChange = vi.fn();
    render(<Layout model={model} factory={factory} ref={ref} onTabSelectionChange={onTabSelectionChange} {...props} />);
    return { model, ref, onTabSelectionChange };
};

const dataTransfer = () => ({ setData: vi.fn(), setDragImage: vi.fn(), effectAllowed: "", dropEffect: "" });

const button = (path: string) => document.body.querySelector(`[data-layout-path="${path}"]`) as HTMLElement;
const multiSelected = () =>
    Array.from(document.body.querySelectorAll(".flexlayout__tab_button--multi-selected, .flexlayout__border_button--multi-selected")).map((el) => el.getAttribute("data-layout-path"));

describe("tab selection", () => {
    it("is set and read through the layout ref, in document order, and reported to onTabSelectionChange", async () => {
        const { ref, onTabSelectionChange } = renderLayout();
        act(() => ref.current!.setSelectedTabIds(["t4", "t1", "nope"]));
        expect(ref.current!.getSelectedTabIds()).toEqual(["t1", "t4"]);
        expect(onTabSelectionChange).toHaveBeenLastCalledWith(["t1", "t4"]);
        await waitFor(() => expect(multiSelected()).toEqual(["/ts0/tb1", "/ts1/tb0"]));
        act(() => ref.current!.setSelectedTabIds([]));
        expect(ref.current!.getSelectedTabIds()).toEqual([]);
        expect(onTabSelectionChange).toHaveBeenLastCalledWith([]);
        await waitFor(() => expect(multiSelected()).toEqual([]));
    });

    it("never holds a single tab", () => {
        const { ref, onTabSelectionChange } = renderLayout();
        act(() => ref.current!.setSelectedTabIds(["t1"]));
        expect(ref.current!.getSelectedTabIds()).toEqual([]);
        expect(onTabSelectionChange).not.toHaveBeenCalled();
    });

    it("pairs the first Ctrl click with the last clicked tab, then toggles", () => {
        const { model, ref } = renderLayout();
        fireEvent.click(button("/ts0/tb1"));
        fireEvent.click(button("/ts0/tb3"), { ctrlKey: true });
        expect(ref.current!.getSelectedTabIds()).toEqual(["t1", "t3"]);
        // a selection click does not show the tab
        expect((model.getNodeById("ts0") as TabSetNode).getSelectedNode()?.getId()).toBe("t1");
        fireEvent.click(button("/ts1/tb1"), { metaKey: true });
        expect(ref.current!.getSelectedTabIds()).toEqual(["t1", "t3", "t5"]);
        fireEvent.click(button("/ts0/tb1"), { ctrlKey: true });
        expect(ref.current!.getSelectedTabIds()).toEqual(["t3", "t5"]);
        fireEvent.click(button("/ts0/tb3"), { ctrlKey: true });
        expect(ref.current!.getSelectedTabIds()).toEqual([]);
    });

    it("pairs the first Ctrl click with the active tabset's shown tab when nothing was clicked", () => {
        const { model, ref } = renderLayout();
        act(() => {
            model.doAction(Actions.setActiveTabset("ts1"));
        });
        fireEvent.click(button("/ts0/tb2"), { ctrlKey: true });
        expect(ref.current!.getSelectedTabIds()).toEqual(["t2", "t4"]);
    });

    it("selects a range with Shift click and restarts the range in another tabset", () => {
        const { ref } = renderLayout();
        fireEvent.click(button("/ts0/tb1"));
        fireEvent.click(button("/ts0/tb3"), { shiftKey: true });
        expect(ref.current!.getSelectedTabIds()).toEqual(["t1", "t2", "t3"]);
        fireEvent.click(button("/ts0/tb0"), { shiftKey: true });
        expect(ref.current!.getSelectedTabIds()).toEqual(["t0", "t1"]);
        // ts1 shows t4: the new range starts there
        fireEvent.click(button("/ts1/tb1"), { shiftKey: true });
        expect(ref.current!.getSelectedTabIds()).toEqual(["t4", "t5"]);
    });

    it("selects border tabs", async () => {
        const { ref } = renderLayout();
        fireEvent.click(button("/border/left/tb0"));
        fireEvent.click(button("/border/left/tb1"), { ctrlKey: true });
        expect(ref.current!.getSelectedTabIds()).toEqual(["b0", "b1"]);
        await waitFor(() => expect(multiSelected()).toEqual(["/border/left/tb0", "/border/left/tb1"]));
    });

    it("is cleared by a plain click, Escape and a pointer down outside the tab buttons", () => {
        const { ref } = renderLayout();
        act(() => ref.current!.setSelectedTabIds(["t0", "t1"]));
        fireEvent.click(button("/ts0/tb2"));
        expect(ref.current!.getSelectedTabIds()).toEqual([]);

        act(() => ref.current!.setSelectedTabIds(["t0", "t1"]));
        fireEvent.keyDown(document, { key: "Escape" });
        expect(ref.current!.getSelectedTabIds()).toEqual([]);

        act(() => ref.current!.setSelectedTabIds(["t0", "t1"]));
        fireEvent.pointerDown(button("/ts0/tb0"));
        expect(ref.current!.getSelectedTabIds()).toEqual(["t0", "t1"]);
        fireEvent.pointerDown(button("/ts0/tabstrip"));
        expect(ref.current!.getSelectedTabIds()).toEqual([]);
    });

    it("drops deleted tabs and clears when fewer than two remain", () => {
        const { model, ref, onTabSelectionChange } = renderLayout();
        act(() => ref.current!.setSelectedTabIds(["t0", "t1", "t4"]));
        act(() => {
            model.doAction(Actions.deleteTab("t1"));
        });
        expect(ref.current!.getSelectedTabIds()).toEqual(["t0", "t4"]);
        expect(onTabSelectionChange).toHaveBeenLastCalledWith(["t0", "t4"]);
        act(() => {
            model.doAction(Actions.deleteTab("t4"));
        });
        expect(ref.current!.getSelectedTabIds()).toEqual([]);
    });

    it("extends the selection with Shift+Arrow keys and toggles with the toggle key", () => {
        const { model, ref } = renderLayout();
        fireEvent.keyDown(button("/ts0/tb1"), { key: "ArrowRight", shiftKey: true });
        expect(ref.current!.getSelectedTabIds()).toEqual(["t1", "t2"]);
        fireEvent.keyDown(button("/ts0/tb2"), { key: "ArrowRight", shiftKey: true });
        expect(ref.current!.getSelectedTabIds()).toEqual(["t1", "t2", "t3"]);
        fireEvent.keyDown(button("/ts0/tb3"), { key: "ArrowLeft", shiftKey: true });
        expect(ref.current!.getSelectedTabIds()).toEqual(["t1", "t2"]);
        fireEvent.keyDown(button("/ts1/tb1"), { key: "Enter", ctrlKey: true });
        expect(ref.current!.getSelectedTabIds()).toEqual(["t1", "t2", "t5"]);
        // the toggle key does not show the tab
        expect((model.getNodeById("ts1") as TabSetNode).getSelectedNode()?.getId()).toBe("t4");
        fireEvent.keyDown(button("/ts0/tb1"), { key: "Enter", ctrlKey: true });
        fireEvent.keyDown(button("/ts0/tb2"), { key: "Enter", ctrlKey: true });
        expect(ref.current!.getSelectedTabIds()).toEqual([]);
    });

    it("passes every dragged tab to onRenderDragRect, grabbed tab first", () => {
        const onRenderDragRect = vi.fn(() => undefined);
        const { model, ref } = renderLayout({ onRenderDragRect });
        act(() => ref.current!.setSelectedTabIds(["t1", "t3"]));
        fireEvent.dragStart(button("/ts0/tb3"), { dataTransfer: dataTransfer() });
        expect(onRenderDragRect).toHaveBeenLastCalledWith("Move tabs (2)", model.getNodeById("t3"), undefined, [model.getNodeById("t3"), model.getNodeById("t1")]);
        fireEvent.dragEnd(button("/ts0/tb3"));

        fireEvent.dragStart(button("/ts0/tb0"), { dataTransfer: dataTransfer() });
        expect(onRenderDragRect).toHaveBeenLastCalledWith(expect.anything(), model.getNodeById("t0"), undefined, [model.getNodeById("t0")]);
        fireEvent.dragEnd(button("/ts0/tb0"));
    });
});
