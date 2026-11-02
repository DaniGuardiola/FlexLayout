import * as React from "react";
import { useRef, useEffect, useImperativeHandle } from "react";
import { TabNode } from "../model/TabNode";
import { TabSetNode } from "../model/TabSetNode";
import { IJsonTabNode } from "../model/IJsonModel";
import { Node } from "../model/Node";
import { Action } from "../model/Actions";
import { BorderNode } from "../model/BorderNode";
import { Model } from "../model/Model";
import { I18nLabelDefaults } from "./I18nLabel";
import { DragRectRenderCallback, NodeMouseEvent, ShowOverflowMenuCallback, TabSetPlaceHolderCallback, ITabSetRenderValues, ITabRenderValues, IIcons, IKeyMap } from "./layout/LayoutTypes";
import { getViewController, LayoutInternal, LayoutController } from "./layout/LayoutInternal";
import { ModelLayout } from "../model/ModelLayout";

export interface ILayoutProps {
    /** the model for this layout */
    model: Model;
    /** factory function for creating the tab components */
    factory: (node: TabNode) => React.ReactNode;
    /** sets a top level class name on popout windows */
    popoutClassName?: string;
    /** keyboard bindings for the layout's command shortcuts (close tab, rename tab, focus toggle,
     * close overlay border), merged over defaultKeyMap; pass an explicit undefined for a binding to
     * disable that shortcut. The configured bindings are advertised to assistive technology via
     * aria-keyshortcuts */
    keyMap?: IKeyMap;
    /** how Tab moves focus through the layout. "dom" (the default) follows the document order of
     * every focusable element. "areas" moves between areas instead: Tab / Shift+Tab go from the
     * shown tab of one tabset or border to the next (tabsets in layout order with the splitters
     * between them, then borders, then the focusable elements of the border toolbars), skipping
     * tab content and toolbar buttons; Enter moves into a tab's content, Tab past its last
     * focusable element goes on to the next stop, and Escape returns to the tab. A tabset without
     * a tab strip or without tabs is entered straight into its content. The area keys are
     * configured via keyMap (nextArea, previousArea, enterArea, exitArea) */
    tabNavigation?: "dom" | "areas";
    /** boolean value, defaults to false. When true, several tabs can be selected and dragged
     * together: Cmd/Ctrl click toggles a tab into the selection, Shift click selects a range
     * within a tabset or border, and the keyMap bindings toggleTabSelection,
     * extendTabSelectionPrevious, extendTabSelectionNext and clearTabSelection apply. When false
     * the selection stays empty (setSelectedTabIds does nothing) and those clicks and keys act as
     * plain ones. Actions.moveNodes works either way */
    tabSelection?: boolean;
    /** Custom icons for close, pin, maximize, restore, more, popout buttons. */
    icons?: IIcons;
    /** function called whenever the layout generates an action to update the model (allows for intercepting actions before they are dispatched to the model, for example, asking the user to confirm a tab close.) Returning undefined from the function will halt the action, otherwise return the action to continue */
    onAction?: (action: Action) => Action | undefined;
    /** function called when rendering a tab, allows leading (icon), content section, buttons and name used in overflow menu to be customized */
    onRenderTab?: (
        node: TabNode,
        renderValues: ITabRenderValues, // change the values in this object as required
    ) => void;
    /** function called when rendering a tabset, allows header and buttons to be customized */
    onRenderTabSet?: (
        tabSetNode: TabSetNode | BorderNode,
        renderValues: ITabSetRenderValues, // change the values in this object as required
    ) => void;
    /** function called when model has changed */
    onModelChange?: (model: Model, action: Action) => void;
    /** function called when the tab selection changes (with tabSelection, the tabs picked with
     * Cmd/Ctrl or Shift clicks to be moved together), with the selected tab ids in document order;
     * an empty array means no selection. A selection always holds at least two tabs, it is view
     * state that is not stored in the model */
    onTabSelectionChange?: (tabIds: string[]) => void;
    /** Handle external drag-and-drop onto the layout. Return undefined to reject. */
    onExternalDrag?: (event: React.DragEvent<HTMLElement>) =>
        | undefined
        | {
              json: IJsonTabNode;
              onDrop?: (node?: Node, event?: React.DragEvent<HTMLElement>) => void;
          };
    /** function called with default css class name, return value is class name that will be used. Mainly for use with css modules. */
    classNameMapper?: (defaultClassName: string) => string;
    /** Function called for each model string (tab names, group names, tabset names) and
     *  each built-in UI label (button tooltips, context menu items) to allow i18n translation.
     *  The function receives the raw string key and must return the translated string.
     *  Built-in UI labels use keys like "flexlayout.ui.close.tab", "flexlayout.ui.menu.pin", etc.
     *  (see I18nLabel enum). If no translator is registered, built-in UI labels fall back to
     *  their default English text. */
    i18nTranslator?: (key: string) => string;
    /** if left undefined will do simple check based on userAgent */
    supportsPopout?: boolean | undefined;
    /** URL of popout window relative to origin, defaults to popout.html */
    popoutURL?: string | undefined;
    /** boolean value, defaults to false, resize tabs as splitters are dragged. Warning: this can cause resizing to become choppy when tabs are slow to draw */
    realtimeResize?: boolean | undefined;
    /** callback for rendering the drag rectangles */
    onRenderDragRect?: DragRectRenderCallback;
    /** callback for handling context actions on tabs and tabsets */
    onContextMenu?: NodeMouseEvent;
    /** callback for handling mouse clicks on tabs and tabsets with alt, meta, shift keys, also handles center mouse clicks */
    onAuxMouseClick?: NodeMouseEvent;
    /** callback for handling the display of the tab overflow menu */
    onShowOverflowMenu?: ShowOverflowMenuCallback;
    /** callback for rendering a placeholder when a tabset is empty */
    onTabSetPlaceHolder?: TabSetPlaceHolderCallback;
    /** Name given to popout windows, defaults to 'Popout Window' */
    popoutWindowName?: string;
    /** the transition speed of the drag rectangle from one position to another, default is 0.3 secs; 0 disables the transition */
    tabDragSpeed?: number;
    /** set to constrain floating panels to within the layout control */
    constrainFloatPanels?: boolean;
    /** boolean value, defaults to true. When true every render of the host <Layout> element
     * invalidates memoized tab content, so factories capturing host state stay fresh. Set to
     * false when tab content does not depend on host render scope: content then refreshes only
     * on model changes or an explicit redraw() call, so unrelated parent renders no longer
     * re-invoke the factory for every visible tab */
    invalidateTabContentOnParentRender?: boolean;
    /**
     * Wrap the content rendered into a popout window, e.g. to inject css-in-js styles into the
     * popout document via an emotion {@link https://emotion.sh/docs/cache-provider CacheProvider}
     * or a styled-components StyleSheetManager targeting the popout document's head. css-in-js
     * libraries that insert rules through the CSSOM (emotion's production "speedy" mode) are
     * invisible to the runtime style copy, so styles must be written into the popout document
     * directly. The default returns the children unchanged.
     */
    renderPopoutContent?: (renderContext: { children: React.ReactNode; layout: ModelLayout; popoutWindow: Window; popoutDocument: Document }) => React.ReactNode;
    /**
     * Called once a popout window's document is ready, before its content is rendered. Allows
     * styling-specific setup to run with the popout window/document in hand (e.g. pre-creating an
     * emotion cache or styled-components sheet that targets the popout document).
     */
    onPopoutOpen?: (layout: ModelLayout, popoutWindow: Window, popoutDocument: Document) => void;
    /**
     * Called when a popout window closes, after its layout has been removed from the model. Allows
     * teardown (e.g. disposing per-window style caches). Fires once per popout, including when the
     * main window unloads.
     */
    onPopoutClose?: (layout: ModelLayout, popoutWindow: Window, popoutDocument: Document) => void;
}

export interface ILayoutApi {
    /** re-render the layout */
    redraw(): void;

    /**
     * Adds a new tab to the given tabset
     * @param tabsetId the id of the tabset where the new tab will be added
     * @param json the json for the new tab node
     * @returns the added tab node or undefined
     */
    addTabToTabSet(tabsetId: string, json: IJsonTabNode): TabNode | undefined;

    /**
     * Adds a new tab by dragging an item to the drop location, must be called from within an HTML
     * drag start handler. You can use the setDragComponent() method to set the drag image before calling this
     * method.
     * @param event the drag start event
     * @param json the json for the new tab node
     * @param onDrop a callback to call when the drag is complete
     */
    addTabWithDragAndDrop(event: DragEvent, json: IJsonTabNode, onDrop?: (node?: Node, event?: React.DragEvent<HTMLElement>) => void): void;

    /**
     * Move a tab/tabset using drag and drop, must be called from within an HTML
     * drag start handler
     * @param event the drag start event
     * @param node the tab or tabset to drag
     */
    moveTabWithDragAndDrop(event: DragEvent, node: TabNode | TabSetNode): void;

    /**
     * Adds a new tab to the active tabset (if there is one)
     * @param json the json for the new tab node
     * @returns the added tab node or undefined
     */
    addTabToActiveTabSet(json: IJsonTabNode): TabNode | undefined;

    /**
     * Sets the drag image from a react component for a drag event
     * @param event the drag event
     * @param component the react component to be used for the drag image
     * @param x the x position of the drag cursor on the image
     * @param y the x position of the drag cursor on the image
     */
    setDragComponent(event: DragEvent, component: React.ReactNode, x: number, y: number): void;

    /**
     * Starts the inline rename edit on the given tab's button (the same edit that
     * double-clicking the tab text starts); does nothing if the tab does not allow renaming
     * @param tabNodeId the id of the tab node to rename
     */
    editTabName(tabNodeId: string): void;

    /**
     * Gets the tab selection (the tabs picked with Cmd/Ctrl or Shift clicks to be moved together)
     * @returns the selected tab ids in document order, empty when there is no selection
     */
    getSelectedTabIds(): string[];

    /**
     * Replaces the tab selection; unknown ids are ignored and fewer than two tabs clear it. Does
     * nothing unless the tabSelection prop is set
     * @param tabIds the ids of the tab nodes to select, pass an empty array to clear the selection
     */
    setSelectedTabIds(tabIds: string[]): void;

    /** Get the root div element of the layout */
    getRootDiv(): HTMLDivElement | null | undefined;

    /**
     * Gets the node an element belongs to, walking up from the element: the tab whose button or
     * panel (which holds the tab's content) contains it, else the tabset or border whose element
     * contains it. Covers the main layout, floating panels and popout windows
     * @param element an element rendered by the layout, e.g. an event target
     * @returns the tab, tabset or border node, or undefined when the element is outside them (e.g.
     * a splitter, or an element outside the layout)
     */
    getNodeForElement(element: Element): TabNode | TabSetNode | BorderNode | undefined;

    /**
     * Gets the element rendered for a node, in whichever window shows it: a tab's button (the
     * default part) or its panel, a tabset's element (tab strip, toolbar and content area) or a
     * border's tab bar
     * @param node the node or its id
     * @param part for tabs, "button" (the default) or "panel"; ignored for other nodes
     * @returns the element, or undefined when the node is not in the model or not rendered (e.g.
     * a tab whose content has not been rendered yet, or a row)
     */
    getElementForNode(node: Node | string, part?: "button" | "panel"): HTMLElement | undefined;
}

/**
 * A React component that hosts a multi-tabbed layout.
 * @category Components
 * @group Main Layout
 */
const Layout = React.forwardRef<ILayoutApi, ILayoutProps>((props, ref) => {
    const controllerRef = useRef<LayoutController>(null);
    const lastModel = useRef<Model>(props.model);
    const key = useRef<number>(0);

    if (lastModel.current !== props.model) {
        // a brand new model remounts the whole layout; a model created via
        // fromJson(json, currentModel) updates in place, keeping the tab contents mounted
        if (props.model.getAdoptedFromModel() !== lastModel.current) {
            key.current++;
        }
        lastModel.current = props.model;
    }

    // sync the i18n translator and defaults to the model
    useEffect(() => {
        props.model.setI18nDefaults(I18nLabelDefaults);
        props.model.setI18nTranslator(props.i18nTranslator);
        return () => {
            props.model.setI18nDefaults(undefined);
            props.model.setI18nTranslator(undefined);
        };
    }, [props.model, props.i18nTranslator]);

    Layout.displayName = "Layout"; // name in react dev tools

    useImperativeHandle(ref, () => ({
        redraw: () => {
            controllerRef.current?.redrawLayoutAndTabContent();
        },
        addTabToTabSet: (tabsetId: string, json: IJsonTabNode): TabNode | undefined => {
            return controllerRef.current?.addTabToTabSet(tabsetId, json);
        },
        addTabWithDragAndDrop: (event: DragEvent, json: IJsonTabNode, onDrop?: (node?: Node, event?: React.DragEvent<HTMLElement>) => void) => {
            controllerRef.current?.addTabWithDragAndDrop(event, json, onDrop);
        },
        moveTabWithDragAndDrop: (event: DragEvent, node: TabNode | TabSetNode) => {
            controllerRef.current?.moveTabWithDragAndDrop(event, node);
        },
        addTabToActiveTabSet: (json: IJsonTabNode): TabNode | undefined => {
            return controllerRef.current?.addTabToActiveTabSet(json);
        },
        setDragComponent: (event: DragEvent, component: React.ReactNode, x: number, y: number) => {
            controllerRef.current?.setDragComponent(event, component, x, y);
        },
        editTabName: (tabNodeId: string) => {
            const node = controllerRef.current?.getModel().getNodeById(tabNodeId);
            if (node instanceof TabNode && node.isEnableRename()) {
                getViewController(node.getLayout())?.setEditingTab(node);
            }
        },
        getSelectedTabIds: (): string[] => {
            return [...(controllerRef.current?.getSelectedTabIds() ?? [])];
        },
        setSelectedTabIds: (tabIds: string[]) => {
            controllerRef.current?.setSelectedTabIds(tabIds);
        },
        getRootDiv: () => {
            return controllerRef.current!.getRootDiv();
        },
        getNodeForElement: (element: Element) => {
            return controllerRef.current?.getNodeForElement(element);
        },
        getElementForNode: (node: Node | string, part?: "button" | "panel") => {
            return controllerRef.current?.getElementForNode(node, part);
        },
    }));

    // fresh object per render to invalidate memoized tab contents (the default). Apps that pass
    // invalidateTabContentOnParentRender={false} get a stable marker instead, so unrelated parent
    // renders no longer re-invoke the factory for every visible tab
    const stableMarker = useRef<object>({});
    const renderMarker = props.invalidateTabContentOnParentRender === false ? stableMarker.current : {};

    return <LayoutInternal key={key.current} ref={controllerRef} {...props} parentRedrawRevision={renderMarker} />;
});

export { Layout };

declare const __VERSION__: string;
export const FlexLayoutVersion = __VERSION__;
