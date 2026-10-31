import * as React from "react";
import { BorderNode } from "../../model/BorderNode";
import { TabGroupNode } from "../../model/TabGroupNode";
import { IJsonTabNode } from "../../model/IJsonModel";
import { Node } from "../../model/Node";
import { TabNode } from "../../model/TabNode";
import { TabSetNode } from "../../model/TabSetNode";

/** renders the drag rectangle; when dragging tabs, nodes holds every dragged tab with the grabbed tab (node) first */
export type DragRectRenderCallback = (content: React.ReactNode | undefined, node?: Node, json?: IJsonTabNode, nodes?: TabNode[]) => React.ReactNode | undefined;

export type NodeMouseEvent = (node: TabNode | TabSetNode | BorderNode | TabGroupNode, event: React.MouseEvent<HTMLElement, MouseEvent>) => void;

export type ShowOverflowMenuCallback = (
    node: TabSetNode | BorderNode,
    mouseEvent: React.MouseEvent<HTMLElement, MouseEvent>,
    items: { index: number; node: TabNode }[],
    onSelect: (item: { index: number; node: TabNode }) => void,
) => void;

export type TabSetPlaceHolderCallback = (node: TabSetNode) => React.ReactNode;

export interface ITabSetRenderValues {
    /** a component to be placed before the tabs */
    leading: React.ReactNode;
    /** components that will be added after the tabs */
    stickyButtons: React.ReactNode[];
    /** components that will be added at the end of the tabset */
    buttons: React.ReactNode[];
    /** position to insert overflow button within [...stickyButtons, ...buttons]
     * if left undefined position will be after the sticky buttons (if any)
     */
    overflowPosition: number | undefined;
}

export interface ITabRenderValues {
    /** the icon or other leading component */
    leading: React.ReactNode;
    /** the main tab text/component */
    content: React.ReactNode;
    /** a set of react components to add to the tab after the content */
    buttons: React.ReactNode[];
}

/** Keyboard bindings for the layout's command shortcuts, each given as a key spec such as
 * "F2", "Escape" or "Ctrl+Delete" (a KeyboardEvent.key name, optionally prefixed by
 * modifiers Ctrl, Shift, Alt, Meta joined with +; Mod is Meta on Apple platforms and Ctrl elsewhere).
 *
 * Bindings given in the Layout keyMap prop are merged over defaultKeyMap; passing an explicit
 * undefined for a binding disables that shortcut. The bindings are advertised to assistive
 * technology via aria-keyshortcuts on the affected elements, so the advertised shortcuts always
 * match the configured ones.
 *
 * Only command shortcuts are configurable; the structural keys defined by the WAI-ARIA widget
 * patterns (arrow keys within a tablist, Enter/Space activation, popup menu navigation) are
 * fixed, since assistive technology announces those from the widget roles themselves.
 *
 * Note: WCAG 2.1.4 requires single printable character shortcuts to be remappable or off by
 * default, so prefer function keys or modifier combinations.
 */
export interface IKeyMap {
    /** closes the focused tab button's tab (when the tab is closeable) */
    closeTab?: string;
    /** starts renaming the focused tab button's tab (when the tab is renameable, tabset tabs only) */
    renameTab?: string;
    /** toggles focus between the selected tab button and its content; off by default */
    focusTabToggle?: string;
    /** moves focus to the selected tab button of the next tabset in the layout (wrapping),
     * from anywhere within the layout including inside tab content; off by default */
    focusNextTabset?: string;
    /** moves focus to the selected tab button of the previous tabset in the layout (wrapping),
     * from anywhere within the layout including inside tab content; off by default */
    focusPreviousTabset?: string;
    /** closes an open overlay border panel when focus is inside it (or on its tab button) and
     * returns focus to the tab button. Escape-to-dismiss is an ARIA convention, so overriding
     * this is rarely a good idea, but it can be rebound or disabled like the other commands */
    closeOverlayBorder?: string;
    /** extends the tab selection from the focused tab button to the previous tab in its tabset
     * or border, moving focus there */
    extendTabSelectionPrevious?: string;
    /** extends the tab selection from the focused tab button to the next tab in its tabset or
     * border, moving focus there */
    extendTabSelectionNext?: string;
    /** adds the focused tab button's tab to the tab selection or removes it (a selection always
     * holds at least two tabs) */
    toggleTabSelection?: string;
    /** clears the tab selection */
    clearTabSelection?: string;
}

/** the default keyboard bindings, exported so applications can display or re-register them */
export const defaultKeyMap: Readonly<IKeyMap> = {
    closeTab: "Ctrl+Delete",
    renameTab: "F2",
    focusTabToggle: undefined,
    focusNextTabset: undefined,
    focusPreviousTabset: undefined,
    closeOverlayBorder: "Escape",
    extendTabSelectionPrevious: "Shift+ArrowLeft",
    extendTabSelectionNext: "Shift+ArrowRight",
    toggleTabSelection: "Mod+Enter",
    clearTabSelection: "Escape",
};

export interface IIcons {
    /** the close button on a tab */
    close?: React.ReactNode | ((tabNode: TabNode) => React.ReactNode);
    /** the pin indicator on a pinned tab */
    pin?: React.ReactNode | ((tabNode: TabNode) => React.ReactNode);
    /** the close button in the tabset toolbar */
    closeTabset?: React.ReactNode | ((tabSetNode: TabSetNode) => React.ReactNode);
    /** the toolbar button that pops the selected tab out into a native window */
    popout?: React.ReactNode | ((tabNode: TabNode) => React.ReactNode);
    /** the toolbar button that pops the selected tab out into a floating panel */
    popoutFloat?: React.ReactNode | ((tabNode: TabNode) => React.ReactNode);
    /** the toolbar button that maximizes the tabset */
    maximize?: React.ReactNode | ((tabSetNode: TabSetNode) => React.ReactNode);
    /** the toolbar button that restores a maximized tabset */
    restore?: React.ReactNode | ((tabSetNode: TabSetNode) => React.ReactNode);
    /** the overflow button shown when tabs are hidden in the tabstrip */
    more?: React.ReactNode | ((tabSetNode: TabSetNode | BorderNode, hiddenTabs: { node: TabNode; index: number }[]) => React.ReactNode);
    /** the arrow shown on the edge dock indicators while dragging */
    edgeArrow?: React.ReactNode;
    /** the active tabset indicator shown when the tabset is active */
    activeTabset?: React.ReactNode | ((tabSetNode: TabSetNode) => React.ReactNode);
    /** the button that closes a floating panel */
    closeFloatPopout?: React.ReactNode | (() => React.ReactNode);
    /** the drag handle in the floating panel header that docks the panel into the main layout */
    dragToDock?: React.ReactNode;
    /** the button in the floating panel header that pops the panel out into a native window */
    popoutFloatWindow?: React.ReactNode;
}
