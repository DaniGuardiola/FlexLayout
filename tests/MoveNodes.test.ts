// @vitest-environment node
import { Actions, BorderNode, DockLocation, IJsonModel, Model, RowNode, TabGroupNode, TabNode, TabSetNode } from "../src";

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
        id: "root",
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

let model: Model;

beforeEach(() => {
    model = Model.fromJson(json);
});

const tabIds = (id: string) => (model.getNodeById(id) as TabSetNode | BorderNode).getTabNodes().map((tab) => tab.getId());
const selectedId = (id: string) => (model.getNodeById(id) as TabSetNode | BorderNode).getSelectedNode()?.getId();
const tab = (id: string) => model.getNodeById(id) as TabNode;

describe("Actions.moveNodes", () => {
    it("builds a MOVE_NODES action", () => {
        const action = Actions.moveNodes(["t0", "t1"], "ts1", DockLocation.CENTER, 1, true);
        expect(action.type).toBe(Actions.MOVE_NODES);
        expect(action.data).toEqual({ fromNodes: ["t0", "t1"], toNode: "ts1", location: "center", index: 1, select: true });
    });

    it("moves the tabs together to a tabset center in document order and selects the first listed tab", () => {
        model.doAction(Actions.moveNodes(["t2", "t0", "t4"], "ts1", DockLocation.CENTER, 1));
        expect(tabIds("ts0")).toEqual(["t1", "t3"]);
        expect(tabIds("ts1")).toEqual(["t0", "t2", "t4", "t5"]);
        expect(selectedId("ts1")).toBe("t2");
    });

    it("appends with index -1", () => {
        model.doAction(Actions.moveNodes(["t0", "t1"], "ts1", DockLocation.CENTER, -1));
        expect(tabIds("ts1")).toEqual(["t4", "t5", "t0", "t1"]);
    });

    it("reorders within the same tabset", () => {
        model.doAction(Actions.moveNodes(["t0", "t1"], "ts0", DockLocation.CENTER, 3));
        expect(tabIds("ts0")).toEqual(["t2", "t0", "t1", "t3"]);
        model.doAction(Actions.moveNodes(["t3", "t1"], "ts0", DockLocation.CENTER, 0));
        expect(tabIds("ts0")).toEqual(["t1", "t3", "t2", "t0"]);
    });

    it("keeps the target selection when select is false", () => {
        model.doAction(Actions.moveNodes(["t0", "t1"], "ts1", DockLocation.CENTER, 0, false));
        expect(selectedId("ts1")).toBe("t4");
    });

    it("moves all tabs into one new tabset when docking to a tabset edge", () => {
        model.doAction(Actions.moveNodes(["t1", "t5"], "ts0", DockLocation.RIGHT, -1));
        const root = model.getRootRow()!;
        expect(root.getChildren().length).toBe(3);
        const newTabset = root.getChildren()[1] as TabSetNode;
        expect(newTabset.getTabNodes().map((t) => t.getId())).toEqual(["t1", "t5"]);
        expect(newTabset.getSelectedNode()?.getId()).toBe("t1");
        expect(tabIds("ts0")).toEqual(["t0", "t2", "t3"]);
        expect(tabIds("ts1")).toEqual(["t4"]);
    });

    it("splits into a new row when docking to a cross-orientation edge", () => {
        model.doAction(Actions.moveNodes(["t5", "t0"], "ts0", DockLocation.BOTTOM, -1));
        const firstChild = model.getRootRow()!.getChildren()[0] as RowNode;
        expect(firstChild).toBeInstanceOf(RowNode);
        const newTabset = firstChild.getChildren()[1] as TabSetNode;
        expect(newTabset.getTabNodes().map((t) => t.getId())).toEqual(["t0", "t5"]);
        expect(newTabset.getSelectedNode()?.getId()).toBe("t5");
    });

    it("moves all tabs into one new tabset when docking to a row edge", () => {
        model.doAction(Actions.moveNodes(["t0", "t4"], "root", DockLocation.LEFT, -1));
        const newTabset = model.getRootRow()!.getChildren()[0] as TabSetNode;
        expect(newTabset.getTabNodes().map((t) => t.getId())).toEqual(["t0", "t4"]);
    });

    it("removes tabsets left empty", () => {
        model.doAction(Actions.moveNodes(["t4", "t5"], "ts0", DockLocation.CENTER, 0));
        expect(model.getNodeById("ts1")).toBeUndefined();
        expect(tabIds("ts0")).toEqual(["t4", "t5", "t0", "t1", "t2", "t3"]);
    });

    it("moves the whole tabset content to its own edge", () => {
        model.doAction(Actions.moveNodes(["t4", "t5"], "ts1", DockLocation.LEFT, -1));
        expect(model.getNodeById("ts1")).toBeUndefined();
        const tabsets = model.getRootRow()!.getChildren() as TabSetNode[];
        expect(tabsets.map((ts) => ts.getTabNodes().map((t) => t.getId()))).toEqual([
            ["t0", "t1", "t2", "t3"],
            ["t4", "t5"],
        ]);
    });

    it("moves tabs into and out of a border", () => {
        model.doAction(Actions.moveNodes(["t1", "t2"], "border_left", DockLocation.CENTER, 1));
        expect(tabIds("border_left")).toEqual(["b0", "t1", "t2", "b1"]);
        model.doAction(Actions.moveNodes(["b1", "b0"], "ts1", DockLocation.CENTER, -1));
        expect(tabIds("border_left")).toEqual(["t1", "t2"]);
        expect(tabIds("ts1")).toEqual(["t4", "t5", "b0", "b1"]);
        expect(selectedId("ts1")).toBe("b1");
    });

    it("moves grouped tabs out of their group like single moves", () => {
        model.doAction(Actions.addTabToNewGroup("t0", "Group"));
        model.doAction(Actions.moveNodes(["t0", "t5"], "ts0", DockLocation.CENTER, -1));
        expect(tab("t0").getParent()).toBeInstanceOf(TabSetNode);
        expect(tabIds("ts0")).toEqual(["t1", "t2", "t3", "t0", "t5"]);
    });

    it("moves tabs into a group", () => {
        model.doAction(Actions.addTabToNewGroup("t0", "Group"));
        const group = tab("t0").getParent() as TabGroupNode;
        model.doAction(Actions.moveNodes(["t4", "t5"], group.getId(), DockLocation.CENTER, -1));
        expect(group.getChildren().map((t) => t.getId())).toEqual(["t0", "t4", "t5"]);
    });

    it("ignores unknown and duplicate ids", () => {
        model.doAction(Actions.moveNodes(["t0", "nope", "t0", "t1"], "ts1", DockLocation.CENTER, -1));
        expect(tabIds("ts1")).toEqual(["t4", "t5", "t0", "t1"]);
    });

    it("notifies change listeners once", () => {
        const after = vi.fn();
        model.addChangeListener({ onAfterAction: after });
        model.doAction(Actions.moveNodes(["t0", "t1", "t4"], "ts1", DockLocation.CENTER, -1));
        expect(after).toHaveBeenCalledTimes(1);
        expect(after.mock.calls[0][0].type).toBe(Actions.MOVE_NODES);
    });
});
