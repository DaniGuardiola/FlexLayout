// @vitest-environment jsdom
import * as React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { Actions, DockLocation, IJsonModel, ILayoutApi, Layout, Model, TabNode, TabSetNode, useUndo } from "../src";

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
        fireEvent.keyDown(button("/ts0/tb2"), { key: "Escape" });
        expect(ref.current!.getSelectedTabIds()).toEqual([]);

        act(() => ref.current!.setSelectedTabIds(["t0", "t1"]));
        fireEvent.pointerDown(button("/ts0/tb0"));
        expect(ref.current!.getSelectedTabIds()).toEqual(["t0", "t1"]);
        fireEvent.pointerDown(button("/ts0/tabstrip"));
        expect(ref.current!.getSelectedTabIds()).toEqual([]);
    });

    it("keeps the selection on Escape outside the layout", () => {
        const model = Model.fromJson(json);
        const ref = React.createRef<ILayoutApi>();
        render(
            <>
                <input aria-label="outside" />
                <Layout model={model} factory={factory} ref={ref} />
            </>,
        );
        act(() => ref.current!.setSelectedTabIds(["t0", "t1"]));
        fireEvent.keyDown(document.querySelector('[aria-label="outside"]')!, { key: "Escape" });
        fireEvent.keyDown(document, { key: "Escape" });
        expect(ref.current!.getSelectedTabIds()).toEqual(["t0", "t1"]);
    });

    it("drops tabs missing from a model swapped in by undo", () => {
        const ref = React.createRef<ILayoutApi>();
        const onTabSelectionChange = vi.fn();
        let undo = () => {};
        let current: Model | null = null;
        const App = () => {
            const result = useUndo(() => Model.fromJson(json));
            undo = result.undo;
            current = result.model;
            return <Layout model={result.model!} factory={factory} ref={ref} onTabSelectionChange={onTabSelectionChange} />;
        };
        render(<App />);
        act(() => {
            current!.doAction(Actions.addTab({ type: "tab", id: "added", name: "Added" }, "ts1", DockLocation.CENTER, -1));
        });
        act(() => ref.current!.setSelectedTabIds(["t0", "added"]));
        expect(ref.current!.getSelectedTabIds()).toEqual(["t0", "added"]);
        act(() => undo());
        expect(current!.getNodeById("added")).toBeUndefined();
        expect(ref.current!.getSelectedTabIds()).toEqual([]);
        expect(onTabSelectionChange).toHaveBeenLastCalledWith([]);
        expect(multiSelected()).toEqual([]);
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

    it("pairs the first toggle key press with the last keyboard activated tab", () => {
        const { ref } = renderLayout();
        fireEvent.click(button("/ts0/tb0"));
        fireEvent.keyDown(button("/ts1/tb1"), { key: "Enter" });
        fireEvent.keyDown(button("/ts0/tb3"), { key: "Enter", ctrlKey: true });
        expect(ref.current!.getSelectedTabIds()).toEqual(["t3", "t5"]);
    });

    it("starts a selection from the toggle key on two tabs, never showing a single selected tab", () => {
        const { ref } = renderLayout();
        fireEvent.click(button("/ts0/tb0"));
        fireEvent.keyDown(button("/border/left/tb1"), { key: " " });
        fireEvent.keyDown(button("/ts0/tb2"), { key: "Enter", ctrlKey: true });
        expect(ref.current!.getSelectedTabIds()).toEqual(["b1", "t2"]);
        act(() => ref.current!.setSelectedTabIds([]));
        // the toggle key on the anchor itself selects nothing, then pairs with the next tab
        fireEvent.keyDown(button("/ts0/tb1"), { key: "Enter" });
        fireEvent.keyDown(button("/ts0/tb1"), { key: "Enter", ctrlKey: true });
        expect(ref.current!.getSelectedTabIds()).toEqual([]);
        expect(multiSelected()).toEqual([]);
        fireEvent.keyDown(button("/ts1/tb0"), { key: "Enter", ctrlKey: true });
        expect(ref.current!.getSelectedTabIds()).toEqual(["t1", "t4"]);
    });

    it("describes selected tab and border buttons to assistive technology", async () => {
        const { ref } = renderLayout({ i18nTranslator: (key) => (key === "flexlayout.ui.selected.for.move" ? "Marked" : key) });
        act(() => ref.current!.setSelectedTabIds(["t1", "b0"]));
        await waitFor(() => expect(button("/ts0/tb1")).toHaveAttribute("aria-description", "Marked"));
        expect(button("/border/left/tb0")).toHaveAttribute("aria-description", "Marked");
        expect(button("/ts0/tb0")).not.toHaveAttribute("aria-description");
        act(() => ref.current!.setSelectedTabIds([]));
        await waitFor(() => expect(button("/ts0/tb1")).not.toHaveAttribute("aria-description"));
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

describe("tab drag outline", () => {
    const outlineTransition = (props: Partial<React.ComponentProps<typeof Layout>>) => {
        renderLayout(props);
        fireEvent.dragStart(button("/ts0/tb1"), { dataTransfer: dataTransfer() });
        const layout = button("/ts0/tb1").closest(".flexlayout__layout")!;
        fireEvent.dragEnter(layout, { dataTransfer: dataTransfer() });
        const transition = (layout.querySelector(".flexlayout__outline_rect") as HTMLElement | null)?.style.transition;
        fireEvent.dragEnd(button("/ts0/tb1"));
        return transition;
    };

    it("moves with a 0.3s transition by default", () => {
        expect(outlineTransition({})).toContain("top 0.3s");
    });

    it("has no transition when tabDragSpeed is 0", () => {
        expect(outlineTransition({ tabDragSpeed: 0 })).toContain("top 0s");
    });
});
