> **dio.la fork.** Published as `@dio.la/flexlayout-react`, with features [lol.mortgage](https://lol.mortgage) needs on top of [caplin/FlexLayout](https://github.com/caplin/FlexLayout). The `dio` branch holds them, rebased on upstream releases; `master` mirrors upstream.

# FlexLayout

[![GitHub](https://img.shields.io/github/license/Caplin/FlexLayout)](https://github.com/caplin/FlexLayout/blob/master/LICENSE)
![npm](https://img.shields.io/npm/dw/flexlayout-react)
[![npm](https://img.shields.io/npm/v/flexlayout-react)](https://www.npmjs.com/package/flexlayout-react)

FlexLayout is a layout manager for React that arranges components in multiple tabsets. Tabs can be resized, moved, and organized into complex layouts.

![FlexLayout Demo Screenshot](screenshots/Screenshot_v0.10.png?raw=true "FlexLayout Demo Screenshot")

[Run the Demo](https://caplin.github.io/FlexLayout/demos/v0.11/demo/index.html)

[Examples](https://caplin.github.io/FlexLayout/demos/v0.11/examples/index.html)

[Example in CodeSandbox](https://codesandbox.io/p/sandbox/yvjzqf)

[API Doc](https://caplin.github.io/FlexLayout/demos/v0.11/typedoc/index.html)

FlexLayout's only dependency is React.

Features:
* Tabs (scrolling or wrapped) — see [Tab Wrapping](https://caplin.github.io/FlexLayout/demos/v0.11/examples/tab-wrapping/) / [Many Tabs](https://caplin.github.io/FlexLayout/demos/v0.11/examples/many-tabs/)
* Pinnable tabs — see [Pinned Tabs](https://caplin.github.io/FlexLayout/demos/v0.11/examples/pinned-tabs/)
* Tab groups (Chrome-style colored group pills) — see [Tab Groups](#tab-groups) / [example](https://caplin.github.io/FlexLayout/demos/v0.11/examples/tab-groups/)
* Border tabsets: splitting the layout or overlaying it, with autohide when empty option — see [Borders](https://caplin.github.io/FlexLayout/demos/v0.11/examples/borders/)
* Tabset dragging (move all tabs in a tabset in one operation)
* Opt-in selection of several tabs (Cmd/Ctrl and Shift click) to move them together — see [Selecting and Moving Several Tabs](#selecting-and-moving-several-tabs)
* Opt-in area keyboard navigation (Tab moves between tabsets and borders, Enter steps into a panel) — see [Moving Between Areas with the Keyboard](#moving-between-areas-with-the-keyboard)
* Docking to tabsets or edges of the frame
* Maximizing tabsets (double-click tabset header or use icon)
* Tab overflow (menu for hidden tabs, mouse wheel scrolling) — see [Many Tabs](https://caplin.github.io/FlexLayout/demos/v0.11/examples/many-tabs/)
* Popout tabs into floating panels or new browser windows — see [Popout](https://caplin.github.io/FlexLayout/demos/v0.11/examples/popout/)
* Submodels (layouts inside layouts) — see [Sublayout](https://caplin.github.io/FlexLayout/demos/v0.11/examples/sublayout/)
* Theming (light, dark, underline, etc., and combined) — see [Theme](https://caplin.github.io/FlexLayout/demos/v0.11/examples/theme/)
* Accessibility (ARIA roles, keyboard operation with a configurable keymap, visible focus) — see [Accessibility](docs/accessibility.md)
* Mobile support (iPad, Android)
* Multiple ways to add tabs (drag, active tabset, by ID) — see [External Drag](https://caplin.github.io/FlexLayout/demos/v0.11/examples/external-drag/) / [Sticky Button](https://caplin.github.io/FlexLayout/demos/v0.11/examples/sticky-button/)
* Comprehensive tab and tabset attributes (`enableTabStrip`, `enableDock`, `enableDrop`, etc.) — see [Min Sizes](https://caplin.github.io/FlexLayout/demos/v0.11/examples/min-sizes/)
* Customizable tab and tabset rendering — see [Tab Rendering](https://caplin.github.io/FlexLayout/demos/v0.11/examples/tab-rendering/) / [Tabset Rendering](https://caplin.github.io/FlexLayout/demos/v0.11/examples/tabset-rendering/)
* Tabset placeholder for empty tabsets — see [Placeholder](https://caplin.github.io/FlexLayout/demos/v0.11/examples/placeholder/)
* Support for internationalization — see [i18n](https://caplin.github.io/FlexLayout/demos/v0.11/examples/i18n/)
* Preservation of component state when tabs are moved
* TypeScript type declarations

## Example Interaction
![FlexLayout Animation](screenshots/Animation.gif?raw=true "FlexLayout Animation")

## Installation

FlexLayout is available on npm. Install it using:

```bash
npm install flexlayout-react
```

The package is ESM-only and must be consumed via `import` (it cannot be loaded with `require()`). Import FlexLayout and its model in your modules:

```javascript
import { Layout, Model, Actions, DockLocation } from 'flexlayout-react';
```

Include a theme. Choose from `alpha_light`, `alpha_dark`, `alpha_rounded`, `light`, `dark`, `underline`, `gray`, `rounded`, or `combined` (see the demo for examples):

```javascript
import 'flexlayout-react/style/alpha_light.css';
```

[Learn how to change the theme dynamically in code](#dynamically-changing-the-theme)


## Usage

The `<Layout>` component renders the tabsets and splitters. It takes the following props:

#### Required props:

| Prop    | Description                                      |
| ------- | ------------------------------------------------ |
| `model` | The layout model                                 |
| `factory` | A factory function for creating React components |

Additional [optional props](#optional-layout-props)

The model is a tree of `Node` objects that define the structure of the layout.

The factory is a function that takes a `Node` object and returns a React component to be hosted within a tab.

Models can be created using the `Model.fromJson(jsonObject)` static method and saved using the `model.toJson()` method.

## Example Configuration:

```javascript
const json = {
    global: {},
    borders: [],
    layout: {
        type: "row",
        weight: 100,
        children: [
            {
                type: "tabset",
                weight: 50,
                children: [
                    {
                        type: "tab",
                        name: "One",
                        component: "placeholder",
                    }
                ]
            },
            {
                type: "tabset",
                weight: 50,
                children: [
                    {
                        type: "tab",
                        name: "Two",
                        component: "placeholder",
                    }
                ]
            }
        ]
    }
};
```

## Example Code

```javascript
const model = Model.fromJson(json);

function App() {

  const factory = (node) => {
    const component = node.getComponent();

    if (component === "placeholder") {
      return <div>{node.getName()}</div>;
    }
  }

  return (
    <Layout
      model={model}
      factory={factory} />
  );
}
```

The above code renders two tabsets horizontally, each containing a single tab that hosts a `div` component (returned from the factory). Tabs can be moved and resized by dragging and dropping. Additional tabs can be added to the layout by sending actions to the model.

<img src="screenshots/Screenshot_two_tabs.png?raw=true" alt="Simple layout" title="Generated Layout"/>

[Try it now using CodeSandbox](https://codesandbox.io/p/sandbox/yvjzqf) — see [Basic](https://caplin.github.io/FlexLayout/demos/v0.11/examples/basic/) — `examples/basic/Basic.tsx`.

Note: The `<Layout>` component must be hosted in a container element (with CSS `position: absolute` or `relative`). The layout will fill the containing element.

A simple TypeScript starter project can be found here:

https://github.com/nealus/flexlayout-vite-example

The model JSON contains four top-level elements:

* `global` - (optional) Global options.
* `layout` - The main row/tabset/tabs layout hierarchy.
* `borders` - (optional) Up to four borders ("top", "bottom", "left", "right").
* `subLayouts` - (optional) Where sub layouts for popout windows, floating panels and tabs are defined.

The `layout` element is built using three types of nodes:

* `row` - Rows contain a list of tabsets and child rows. The top-level `row` renders horizontally by default (unless the global attribute `rootOrientationVertical` is set). Child rows render in the opposite orientation to their parent row.
* `tabset` - Tabsets contain a list of tabs and the index of the selected tab.
* `tab` - Tabs specify the component to host (loaded via the factory) and the tab's display text.

The layout structure is defined with rows within rows that contain tabsets that themselves contain tabs.

Within the demo app, you can view the layout structure by checking the 'Structure' box. Rows are shown in blue, and tabsets in orange.

![FlexLayout Demo Showing Layout](screenshots/Screenshot_layout.png?raw=true "Demo showing layout")

The optional `borders` element is made up of border nodes:

* `border` - Borders contain a list of tabs and the index of the selected tab. They can only be used within the `borders` top-level element.

The JSON model tree structure is defined as TypeScript interfaces; see [JSON Model](#json-model-definition).

Each node type has a defined set of required and optional attributes.

Weights on rows and tabsets specify their relative size within the parent row. The absolute values do not matter, only their proportions (e.g., two tabsets with weights 30 and 70 would render the same as if they had weights 3 and 7).

NOTE: The easiest way to create your initial layout JSON is to use the [demo](https://caplin.github.io/FlexLayout/demos/v0.11/demo/index.html) app. Modify an existing layout by dragging, dropping, and adding nodes, then press the 'print' button to print the JSON to the browser's developer console. Use the Model Explorer panel to view and modify the attributes of the layout and its nodes, and use the render dropdown in the demo to blank out the panels (other than the Model Explorer) so you can focus on the layout.

By changing global or node attributes, you can modify the layout's appearance and functionality. For example, setting `tabSetEnableTabStrip: false` in the global options would change the layout into a multi-splitter (without tabs or drag-and-drop):

```
 global: {tabSetEnableTabStrip:false},
```

### Attribute inheritance from global options

Node attributes inherit their default value from the corresponding global attribute, so you can set a value for all nodes of a type in one place and override it per-node. The global attribute is the node attribute prefixed with the node type: `tab` for tab attributes (e.g. `tabEnableClose`), `tabSet` for tabset attributes (e.g. `tabSetEnableDrag`), and `border` for border attributes (e.g. `borderSize`).

For example, to make all tabs non-closeable but allow the tab with id `"persistent"` to be closed anyway:

```json
{
    "global": { "tabEnableClose": false },
    "layout": {
        "type": "row",
        "children": [
            {
                "type": "tabset",
                "children": [
                    { "type": "tab", "name": "One", "component": "placeholder" },
                    { "type": "tab", "name": "Two", "component": "placeholder" },
                    { "type": "tab", "id": "persistent", "name": "Persistent", "component": "placeholder", "enableClose": true }
                ]
            }
        ]
    }
}
```

The "Persistent" tab's `enableClose: true` overrides the inherited global default of `false`; the other tabs keep the global value.

## Dynamically Changing the Theme

The `combined.css` theme includes all other themes and supports dynamic theme switching.

When using `combined.css`, add a `className` (in the form `flexlayout__theme_[theme-name]`) to the `div` containing the `<Layout>` to select the desired theme.

For example: 
```tsx
    <div ref={containerRef} className="flexlayout__theme_alpha_light">
        <Layout model={model} factory={factory} />
    </div>
```

Change the theme in code by changing the className on the containing div.

For example:
```tsx
    containerRef.current!.className = "flexlayout__theme_alpha_dark"
```

See [Theme](https://caplin.github.io/FlexLayout/demos/v0.11/examples/theme/) — `examples/theme/Theme.tsx`.

## Overriding Theme Variables

All themeable values (`--fl-color-*`, `--fl-font-*`, `--fl-splitter-size`, `--fl-tab-button-radius`, etc.) are CSS custom properties defined in `style/_themes.scss`. Each one is defined as `var(--flexlayout-<name>, <theme default>)` — so the theme default applies unless the matching global `--flexlayout-<name>` variable is defined, in which case that value is used everywhere (float windows, sublayouts, and popout windows included).

To restyle the whole layout without rebuilding the scss, set the global variable on a common ancestor (e.g. `:root` or the div wrapping the `<Layout>`):

```css
:root {
    --flexlayout-color-1: #90a4ae;                 /* base color, feeds derived colors */
    --flexlayout-color-tabset-background: #ffffff;  /* or override a specific value */
    --flexlayout-splitter-size: 10px;
}
```

Override a `--flexlayout-<name>` variable and every theme uses it; leave it unset and each theme keeps its own default (so theme switching is unaffected). The single-theme stylesheets (`light.css`, `dark.css`, etc.) work the same way — a global override reaches every layout on the page, including float windows.

## Customizing Tabs

You can use the `<Layout>` prop `onRenderTab` to customize tab rendering:

<img src="screenshots/Screenshot_customize_tab.png?raw=true" alt="FlexLayout Tab structure" title="Tab structure"/>

Update the `renderValues` parameter as needed:

`renderValues.leading`: The area shown in red.

`renderValues.content`: The area shown in green.

`renderValues.buttons`: The area shown in yellow.

For example:

```tsx
onRenderTab = (node: TabNode, renderValues: ITabRenderValues) => {
    // renderValues.leading = <img style={{width:"1em", height:"1em"}}src="images/folder.svg"/>;
    // renderValues.content += " *";
    renderValues.buttons.push(<img key="menu" style={{width:"1em", height:"1em"}} src="images/menu.svg"/>);
}
```

See [Tab Rendering](https://caplin.github.io/FlexLayout/demos/v0.11/examples/tab-rendering/) — `examples/tab-rendering/TabRendering.tsx`.

## Customizing Tabsets

You can use the `<Layout>` prop `onRenderTabSet` to customize tabset rendering:

<img src="screenshots/Screenshot_customize_tabset.png?raw=true" alt="FlexLayout Tab structure" title="Tabset structure" />

Update the `renderValues` parameter as needed:

`renderValues.leading`: The area shown in blue.

`renderValues.stickyButtons`: The area shown in red.

`renderValues.buttons`: The area shown in green.


For example:

```tsx
onRenderTabSet = (node: (TabSetNode | BorderNode), renderValues: ITabSetRenderValues) => {
    renderValues.stickyButtons.push(
        <button
            key="Add"
            title="Add"
            className="flexlayout__tab_toolbar_button"
            onClick={() => {
                model.doAction(Actions.addTab({
                    component: "placeholder",
                    name: "Added " + nextAddIndex.current++
                }, node.getId(), DockLocation.CENTER, -1, true));
            }}
        ><AddIcon/></button>);

    renderValues.buttons.push(<img key="menu" style={{width:"1em", height:"1em"}} src="images/menu.svg"/>);
}
```

See [Tabset Rendering](https://caplin.github.io/FlexLayout/demos/v0.11/examples/tabset-rendering/) — `examples/tabset-rendering/TabSetRendering.tsx` and [Sticky Button](https://caplin.github.io/FlexLayout/demos/v0.11/examples/sticky-button/) — `examples/sticky-button/StickyButton.tsx`.

## Customizing Icons

The built-in icons (close, pin, maximize/restore, popout, float, overflow, etc.) can be replaced via the `icons` layout prop. Each entry of the `IIcons` object is either a React node or a function receiving the relevant node and returning one:

```tsx
<Layout
    model={model}
    factory={factory}
    icons={{
        close: <MyCloseIcon />,
        // functions receive the node, so the icon can depend on its state;
        // 'more' also receives the hidden tabs, e.g. to show a count
        more: (node, hiddenTabs) => <div>{hiddenTabs.length}</div>,
    }}
/>
```

The default icons are also exported (`CloseIcon`, `PinIcon`, `MaximizeIcon`, ...) for reuse in your own toolbars and menus. Icons are decorative to assistive technology (the buttons carry their own accessible names), so custom icons do not need alt text.

## Localization

All text — both model data (tab names, group names, tabset names) and built-in UI labels (button tooltips, context menu items) — is routed through the `i18nTranslator` layout prop. The function receives a string key and must return the translated string. Built-in UI labels use keys from the `I18nLabel` enum (e.g. `"flexlayout.ui.close.tab"`, `"flexlayout.ui.menu.rename"`). If no translator is registered, the default English text is used automatically:

```tsx
const translations: Record<string, Record<string, string>> = {
    en: {
        // model text (any keys you like)
        "tab.welcome": "Welcome",
        "tab.settings": "Settings",
        // built-in UI labels (I18nLabel enum values)
        "flexlayout.ui.close.tab": "Close",
        "flexlayout.ui.menu.pin": "Pin",
        "flexlayout.ui.menu.rename": "Rename",
        "flexlayout.ui.menu.close.all": "Close All",
    },
    de: {
        "tab.welcome": "Willkommen",
        "tab.settings": "Einstellungen",
        "flexlayout.ui.close.tab": "Schließen",
        "flexlayout.ui.menu.pin": "Anheften",
        "flexlayout.ui.menu.rename": "Umbenennen",
        "flexlayout.ui.menu.close.all": "Alle schließen",
    },
};

const getTranslator = (lang: string) => (key: string) => translations[lang][key] ?? key;

<Layout
    model={model}
    factory={factory}
    i18nTranslator={getTranslator("de")}
/>
```

Model strings are passed through the translator as-is (use whatever key scheme you like in your JSON). Built-in UI keys follow the pattern `flexlayout.ui.<category>.<name>` — return the key unchanged to keep the default English text. See `examples/i18n/` for a complete working example with language switching and translated context menus.

## Context Menu

Use the `ContextMenuBuilder` to build a custom menu, choosing which options to show, interleaving your own entries and placing dividers, then show it with `showPopupMenu` from a right-click handler:

```tsx
import { showPopupMenu, ContextMenuBuilder } from "flexlayout-react";

const onContextMenu = (node: TabNode | TabSetNode | BorderNode, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    const container = node.getLayoutRef()!;
    if (!container) return;

    const items = new ContextMenuBuilder(node)
        .add("rename")
        .addCustom({ key: "my-command", label: "My Command", onSelect: () => doThing() })
        .add("pin")
        .addDivider()
        .add("close")
        .build();
    showPopupMenu({
        anchor: { x: event.clientX, y: event.clientY },
        items,
        onClose: () => {},
        container
    });
};

<Layout model={model} factory={factory} onContextMenu={onContextMenu} />
```

The items returned by `build()` (and the `getNodeContextMenuItems` helper) are plain data, so they don't have to be shown via `showPopupMenu` — you can render them in your own styled menu component. Each item's `label` is the menu text already resolved through the layout's `i18nTranslator`, and its `onSelect` fires the corresponding action against the node's model.

See [Context Menu](https://caplin.github.io/FlexLayout/demos/v0.11/examples/context-menu/) — `examples/context-menu/ContextMenu.tsx`.

## Model Actions

Once the model JSON has been loaded, all changes are applied through actions. In the Demo app, you can view these actions in the 'Action Log':

<img src="screenshots/Screenshot_action_log.png?raw=true" alt="Action Log" title="Action Log" />

Apply actions using the `model.doAction()` method. This method takes a single argument created by one of the action generators (accessible via the `Actions` import):

[Actions Documentation](https://caplin.github.io/FlexLayout/demos/v0.11/typedoc/classes/Actions.html)

### Example

```js
model.doAction(Actions.addTab(
    {type:"tab", component:"grid", name:"a grid", id:"5"},
    "1", DockLocation.CENTER, 0));
```

This example adds a new grid component to the center of the tabset with ID "1" at the first position (0). Use `-1` to add to the end of the tabs.

Note: You can retrieve the ID of a node (e.g., the node returned by the `addTab` action) using `node.getId()`. If an ID wasn't assigned when the node was created, one will be generated for you in the form `#<uuid>` (e.g., `#0c459064-8dee-444e-8636-eb9ab910fb27`).

Note: You can intercept actions resulting from GUI changes before they are applied by implementing the `onAction` callback property of the `Layout`.

### Undo / redo

The `useUndo` React hook encapsulates undo/redo for a model. It owns the model state, records an undo snapshot before each mutation (so an entire drag gesture collapses into a single step), and replaces the model on undo/redo via `Model.fromJson`, keeping mounted tab content intact:

```javascript
function App() {
    const { model, setModel, undo, redo, canUndo, canRedo, undoCount, redoCount } = useUndo(Model.fromJson(initialJson));

    return (
        <>
            <Layout model={model} factory={factory} />
            <button onClick={undo} disabled={!canUndo} title={"undo (" + undoCount + ")"}>Undo</button>
            <button onClick={redo} disabled={!canRedo} title={"redo (" + redoCount + ")"}>Redo</button>
        </>
    );
}
```

Notes:
- The model can be passed lazily (a function evaluated once), or omitted and loaded later: `const { model, setModel, ... } = useUndo();` then `setModel(Model.fromJson(json))`.
- `setModel(model)` replaces the model and clears the history; pass `false` as a second argument to keep the history (e.g. for an in-place round-trip of the same model). Use `reset()` to clear the history without replacing the model.
- Options: `maxBufferSize` (default 100) and `ignoreActionTypes` (default `[Actions.SET_ACTIVE_TABSET]`) - actions whose types are listed do not create undo steps.

See [Undo / Redo](https://caplin.github.io/FlexLayout/demos/v0.11/examples/undo-redo/) — `examples/undo-redo/UndoRedo.tsx`.


## Tab Groups

Tabs can be grouped into Chrome-style groups, rendered as a colored pill in the tab strip. A group is a `"tabgroup"` node that is a direct child of a tabset or border and holds the group's tabs as children.

A group is shown in one of two visual styles, chosen by the global attribute `tabGroupType` (`"splitpill"` by default, or `"underline"`):

```json
{
    "global": { "tabGroupType": "splitpill" }
}
```

`"splitpill"` encloses the group's tabs in a pill with left/right caps:

<img src="screenshots/Screenshot_tab_groups_splitpill.png?raw=true" alt="Tab groups (split pill)" title="Tab groups (split pill)" />

`"underline"` shows a fully-rounded pill followed by tabs that each carry the group color as an underline:

<img src="screenshots/Screenshot_tab_groups_underline.png?raw=true" alt="Tab groups (underline)" title="Tab groups (underline)" />

```json
{
    "type": "tabgroup",
    "id": "g1",
    "name": "Design",
    "color": "#7895c4",
    "opened": true,
    "children": [
        { "type": "tab", "name": "Colors", "component": "label" },
        { "type": "tab", "name": "Typography", "component": "label" }
    ]
}
```

The group pill shows the group's `name` and is filled with the group's `color`. Clicking the pill collapses/expands the group; when collapsed (`"opened": false`) only the pill is shown, with a count of its hidden tabs.

Groups support drag-and-drop: drag a tab onto a pill to add it to the group, drag a tab out to remove it, and drag the pill itself to reorder or move the whole group. Right-clicking a pill opens a menu to rename the group, change its color, collapse/expand, or ungroup it.

Use these actions to manage groups programmatically:

```js
model.doAction(Actions.addTabToNewGroup("tab5", "Design", "#7895c4")); // move a tab into a new group
model.doAction(Actions.ungroup("g1"));                                 // return a group's tabs to the tabset
model.doAction(Actions.removeTabFromGroup("tab2"));                    // move a tab out of its group
```

For an example see [Tab Groups](https://caplin.github.io/FlexLayout/demos/v0.11/examples/tab-groups/) — `examples/tab-groups/TabGroups.tsx` (also the `Tab Groups` layout in the demo app).

## Selecting and Moving Several Tabs

Tabs can be selected together and dragged as one, like files in a file manager. This is off by default; set the `tabSelection` prop to turn it on:

```tsx
<Layout model={model} factory={factory} tabSelection={true} />
```

Without it, Cmd/Ctrl and Shift clicks and the selection keys below act as plain clicks and keys, as in upstream FlexLayout, the selection stays empty and `setSelectedTabIds` does nothing; turning the prop off clears any selection. `Actions.moveNodes` (below) works either way.

A selection always holds at least two tabs; a single tab is never "selected" (dragging or right-clicking a tab acts on it directly). The selection is separate from the tab shown in each tabset, and it is view state: it is not stored in the model, so it is never saved or serialized.

* Cmd (macOS) / Ctrl click a tab to start a selection with the last clicked or keyboard-activated tab (or, if there is none yet, the shown tab of the active tabset); further Cmd/Ctrl clicks add or remove tabs. Removing all but one tab clears the selection.
* Shift click selects the range from the last clicked tab to the clicked tab. Ranges never reach across tabsets or borders: a Shift click in another tabset starts a new range there, from that tabset's shown tab. Cmd/Ctrl clicks can still combine tabs from several tabsets.
* A plain click shows the tab as before and clears the selection, as do Escape pressed within the layout, a pointer down anywhere in the layout outside the tab buttons, closing tabs until fewer than two remain, and a new `model` (e.g. an undo step) that lacks enough of the selected tabs.
* Keyboard: Shift+ArrowLeft / Shift+ArrowRight on a focused tab extends the selection within its tabset, and Mod+Enter (Cmd+Enter on macOS, Ctrl+Enter elsewhere) adds or removes the focused tab. Activating a tab with Enter or Space counts as clicking it, so the first Mod+Enter pairs the focused tab with the last clicked or activated one; on that tab itself it selects nothing, so Mod+Enter on one tab and then another selects exactly those two. These bindings, and Escape for clearing, are configurable via the `keyMap` prop (see [Accessibility](docs/accessibility.md)).
* Dragging a selected tab moves the whole selection; dragging an unselected tab moves only that tab and leaves the selection alone. The moved tabs land together at the drop point in their document order (the main layout's tabsets in layout order, then the borders in the order of the model's `borders` array, then popout and floating layouts by layout id, each in tab order: the order area navigation walks them), the grabbed tab becomes the shown tab, and docking to an edge puts them all in one new tabset. Tabsets left empty are removed as with single moves.
* Selected tabs that cannot be dragged (`enableDrag: false`) stay where they are when the others are dragged. A selection drops only where every dragged tab may go: if `onAllowDrop` refuses one of them, a selected pinned tab would leave its tabset, or a tab is not allowed in the target popout window, the selection is not dropped there.

Selected tab buttons get the `flexlayout__tab_button--multi-selected` (or `flexlayout__border_button--multi-selected`) class, tinted with the `--fl-color-tab-multi-selected-background` theme variable, and the accessible description "Selected for move" (`aria-description`, translatable as `I18nLabel.Selected_For_Move`). When dragging a selection the default drag image reads "Move tabs (n)", and `onRenderDragRect` receives every dragged tab as its fourth argument, grabbed tab first, to render a custom preview.

```tsx
const layoutRef = React.useRef<ILayoutApi>(null);

<Layout ref={layoutRef} model={model} factory={factory} tabSelection={true} onTabSelectionChange={(tabIds) => console.log(tabIds)} />;

layoutRef.current!.getSelectedTabIds(); // the selected tab ids in document order, [] when none
layoutRef.current!.setSelectedTabIds(["tab1", "tab4"]); // pass [] to clear
```

A selection move is a single action, so `onAction` sees it once and undo treats it as one step. It can also be done programmatically:

```js
model.doAction(Actions.moveNodes(["tab4", "tab1"], "tabset2", DockLocation.CENTER, -1)); // tab4 becomes the shown tab
```

## Moving Between Areas with the Keyboard

By default Tab walks every focusable element of the layout in document order: tab strips, toolbar buttons and the contents of every panel. Set the `tabNavigation` prop to `"areas"` to move between areas first and step into the one you want:

```tsx
<Layout model={model} factory={factory} tabNavigation="areas" />
```

* An area is a tabset or a border. Tab and Shift+Tab move from the shown tab of one area to the next, skipping tab content, tabset toolbar buttons (maximize, overflow, popout, sticky and custom buttons) and any buttons rendered inside tab buttons. A collapsed border is a stop on its first tab.
* A tabset without a tab strip (`enableTabStrip: false`) or without tabs has no tab to stop on, so its stop is its content: the first focusable element of the shown tab's panel, or of the empty tabset's `onTabSetPlaceHolder` content, else the panel or placeholder area itself. Tab past its last control goes on to the next stop and Shift+Tab before its first one to the previous stop; Escape stays in the content.
* The splitters between areas are stops too, so panels can be resized from the keyboard: the arrow keys resize as usual, Tab and Shift+Tab move on to the next and previous stop, and F6 / Shift+F6 to the next and previous area.
* The order is the layout order: the tabsets in layout tree order (each row lays out its children left to right or top to bottom, so this is the visual reading order; only the maximized tabset while one is maximized) with each splitter between the areas it separates, then the borders with tabs in the order of the model's `borders` array, each after its splitter while it is open, then the focusable elements of the toolbar of every shown border (the `buttons` added via `onRenderTabSet`, plus the overflow and popout buttons) as the last stops. A border without tabs is not an area, but its toolbar is still reachable when it stays shown (`enableAutoHide: false`).
* Tab from the last stop leaves the layout to the next focusable element after it, and Shift+Tab from the first stop leaves to the element before it. Tab entering the layout from outside (in either direction) lands on the stop of the area that last had focus, else the first area; only that area's tab button has `tabindex="0"`.
* Left / Right (and Up / Down) move between the tabs of a strip as before; Home / End move to the first / last tab.
* Enter on a tab shows it if needed (opening a collapsed border) and moves focus to the first focusable element in its content, or to the content itself when it has none. Space only shows the tab. With `tabSelection`, Mod+Enter still toggles the tab selection; renaming stays on F2 and double-click.
* Inside the content Tab and Shift+Tab move through its controls as usual, skipping what the browser skips (hidden or `inert` elements, controls in a disabled fieldset). Tab past the last control goes on to the next stop, and Shift+Tab before the first one returns to the panel's own tab. Escape returns to the panel's tab unless the content handled the key first (called `preventDefault()`, as menus, editors and dialogs usually do).
* F6 / Shift+F6 move to the next / previous area's stop (wrapping) from anywhere within the layout, including inside a panel or on a splitter.
* Popout windows navigate between their own tabsets the same way. Floating panels are not areas and Tab does not reach them in this mode (Tab from the last stop leaves the layout, and Tab entering it lands on an area); click into a floating panel to tab through its contents.

Enter, Escape and F6 / Shift+F6 are the `enterArea`, `exitArea`, `nextArea` and `previousArea` bindings of the `keyMap` prop (see [Accessibility](docs/accessibility.md)); they only apply with `tabNavigation="areas"`. Do not also bind `focusTabToggle` to F6 in this mode, as it takes precedence on tab buttons.

## Tabset Placeholder

When a tabset has no tabs and it's the last tabset or has `tabSetEnableDeleteWhenEmpty: false` then you can show custom content by providing a `onTabSetPlaceHolder` callback on the `<Layout>`:

```tsx
const json: IJsonModel = {
  global: { tabSetEnableDeleteWhenEmpty: false },
  layout: { type: "row", children: [{ type: "tabset", id: "ts0", children: [] }] }
};

function Placeholder() {
  const layoutRef = useRef<ILayoutApi>(null);
  let nextId = 0;
  const onTabSetPlaceHolder = (node: TabSetNode) => (
    <div style={{ display: "flex", flexGrow: 1, alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
      <div>Drop a tab here</div>
      <button onClick={() => layoutRef.current?.addTabToTabSet(node.getId(), { name: "Tab " + nextId++, component: "panel" })}>
        Add a tab
      </button>
    </div>
  );
  return <Layout ref={layoutRef} model={model} factory={factory} onTabSetPlaceHolder={onTabSetPlaceHolder} />;
}
```

The callback receives the empty `TabSetNode` and should return a flex-filled element (`flexGrow: 1`). See [Placeholder](https://caplin.github.io/FlexLayout/demos/v0.11/examples/placeholder/) — `examples/placeholder/Placeholder.tsx`.

## Layout API Methods to Create New Tabs

The Layout Ref provides methods for adding tabs:

[Layout Methods Documentation](https://caplin.github.io/FlexLayout/demos/v0.11/typedoc/interfaces/ILayoutApi.html)

Example:

```javascript
layoutRef.current.addTabToTabSet("NAVIGATION", { type: "tab", component: "grid", name: "a grid" });
```
This adds a new grid component to the tabset with ID "NAVIGATION". (where `layoutRef` is a React ref to the `Layout` element; see [React Refs](https://react.dev/learn/referencing-values-with-refs)).

See [External Drag](https://caplin.github.io/FlexLayout/demos/v0.11/examples/external-drag/) — `examples/external-drag/ExternalDrag.tsx` and [Sticky Button](https://caplin.github.io/FlexLayout/demos/v0.11/examples/sticky-button/) — `examples/sticky-button/StickyButton.tsx`.

## Scrolling When Tabsets No Longer Fit

Tabsets keep their minimum size (`tabSetMinWidth` / `tabSetMinHeight` in the global attributes, or a
tabset's own `minWidth` / `minHeight`), and splitters stop there. By default a layout whose tabsets no
longer fit at those sizes is clipped. With the `scrollOnOverflow` prop, the area inside the borders
scrolls instead, as a last resort, while the borders and their tabs stay in place:

```javascript
<Layout model={model} factory={factory} scrollOnOverflow />
```

Tab content follows the scroll and is clipped to the visible part of the main area, so a tabset
scrolled under a border neither shows nor takes the pointer. Only visible tabsets take drops. Moving
focus into a tab panel scrolled out of view scrolls the main area just enough to show the focused
element; tab buttons scroll into view as the browser focuses them. A maximized tabset fills the
visible area and the main area does not scroll while it is maximized.

## Finding Nodes and Their Elements

The Layout Ref also maps between the model and the rendered elements, so application code (focus management, custom keys, highlighting) does not need to rely on the layout's internal element ids or class names:

```tsx
const layoutRef = React.useRef<ILayoutApi>(null);

<Layout ref={layoutRef} model={model} factory={factory} />;

// the tab, tabset or border an element belongs to, e.g. an event target
const node = layoutRef.current!.getNodeForElement(event.target as Element);

// the element rendered for a node (or node id)
layoutRef.current!.getElementForNode("tab1")?.focus(); // the tab's button
layoutRef.current!.getElementForNode("tab1", "panel"); // the tab's panel, which holds its content
layoutRef.current!.getElementForNode("tabset1"); // the tabset (tab strip, toolbar and content area)
```

* `getNodeForElement(element)` walks up from the element and returns the `TabNode` whose button or panel holds it (including anything inside the tab's content), else the `TabSetNode` or `BorderNode` whose element holds it (e.g. the tab strip or toolbar), else `undefined` (e.g. splitters, or elements outside the layout). Tab content is rendered in a layer of its own, not inside its tabset's element, so content maps to its tab; use `getParent()` for the tabset.
* `getElementForNode(node, part?)` takes a node or a node id. For a tab, `part` picks its button (`"button"`, the default) or its panel (`"panel"`); a tabset gives its `flexlayout__tabset` element and a border its tab bar. It returns `undefined` for ids not in the model, other node types, and elements not currently rendered (e.g. the panel of a tab whose content has not been rendered yet with `enableRenderOnDemand`).
* Both cover every window: the main layout, floating panels and popout windows. Elements in a popout window belong to that window's document.


## Tab Node Events

You can handle node events by adding a listener, typically within a component's `useEffect` hook:

Example:
```javascript
function MyComponent({ node }) {
  useEffect(() => {
    const listenerId = node.setEventListener("save", () => {
      node.getConfig().subject = subject;
    });
    return () => node.removeEventListener(listenerId);
  }, [subject]);
}
```

| Event      | Parameters | Description |
| ---------- | ---------- | ----------- |
| resize     | `{rect}`   | Called during layout when the tab's size changes, after its panel has been positioned to the new `rect` and before the browser paints. Geometry is applied imperatively, so a resize does not re-render the tab content — listen for this event if a component needs to react to size changes. |
| close      | None       | Called when the tab is closed. |
| visibility | `{visible}`| Called when the tab's visibility changes (during layout, before paint). |
| save       | None       | Called before a `TabNode` is serialized to JSON. Use this to save node configuration by adding data to the object returned by `node.getConfig()`. |

## Accessibility

FlexLayout has keyboard operability, ARIA semantics and visible focus styling built in.

Full details — at [docs/accessibility.md](docs/accessibility.md).

## Testing Your Layout

Every element the library renders carries a `data-layout-path` attribute describing its position in the layout tree — a stable selector for end-to-end tests.

Full details — at [docs/testing-your-layout.md](docs/testing-your-layout.md).

## Popout Windows

Tabs can be rendered into external browser windows (useful for multi-monitor setups) by using the `enablePopout` and `enablePopoutIcon` attributes. When enabled, a popout icon appears in the tab header. See [Popout](https://caplin.github.io/FlexLayout/demos/v0.11/examples/popout/) — `examples/popout/Popout.tsx`.

Full details — at [docs/popout-windows.md](docs/popout-windows.md).

## Optional Layout Props

Many optional properties can be applied to the layout:

[Layout Properties Documentation](https://caplin.github.io/FlexLayout/demos/v0.11/typedoc/interfaces/ILayoutProps.html)


## JSON Model Definition

The JSON model is defined as a set of TypeScript interfaces. See the documentation for details on allowed attributes:

[Model Attributes Documentation](https://caplin.github.io/FlexLayout/demos/v0.11/typedoc/interfaces/IJsonModel.html)

[Global Attributes Documentation](https://caplin.github.io/FlexLayout/demos/v0.11/typedoc/interfaces/IGlobalAttributes.html)

[Row Attributes Documentation](https://caplin.github.io/FlexLayout/demos/v0.11/typedoc/interfaces/IJsonRowNode.html)

[Tabset Attributes Documentation](https://caplin.github.io/FlexLayout/demos/v0.11/typedoc/interfaces/IJsonTabSetNode.html)

Note: Tabsets are dynamically created as tabs are moved and deleted when their last tab is removed (unless `enableDeleteWhenEmpty` is set to `false`).

[Tab Attributes Documentation](https://caplin.github.io/FlexLayout/demos/v0.11/typedoc/interfaces/ITabAttributes.html)

[Border Attributes Documentation](https://caplin.github.io/FlexLayout/demos/v0.11/typedoc/interfaces/IJsonBorderNode.html)

See [Load / Save](https://caplin.github.io/FlexLayout/demos/v0.11/examples/localstorage/) — `examples/localstorage/LocalStorage.tsx` for saving/restoring models.


## Running the Demo and Building the Project

First, install the dependencies:

```
pnpm install
```

Run the demo app:

```
pnpm dev
```

The `pnpm dev` command watches for changes in both FlexLayout and the Demo app, allowing you to see updates in your browser immediately.

Run the unit tests with:

```bash
pnpm test
```

Run the playwright tests with:

```bash
pnpm playwright
```

or interactively in the playwright ui with `pnpm playwright:ui`.

<img src="screenshots/PlaywrightUI.png?raw=true" alt="PlaywrightUI" title="PlaywrightUI screenshot"/>

To build the npm distribution, run:

```bash
pnpm build
```
