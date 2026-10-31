# Accessibility

FlexLayout has keyboard operability, ARIA semantics and visible focus styling built in.

## ARIA roles

* Tabs follow the [WAI-ARIA Tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/): the tab strip is a `tablist`, each tab button is a `tab` with `aria-selected`, and each tab's content area is a `tabpanel` labelled by its tab (`aria-labelledby`).
* Splitters are exposed as `separator` elements with `aria-orientation` and `aria-valuenow`/`aria-valuemin`/`aria-valuemax`.
* The tab overflow menu (and the reusable popup menu below) use `role="menu"`/`role="menuitem"`; the button that opens the overflow menu advertises `aria-haspopup` and `aria-expanded`.
* Decorative icons are hidden from assistive technology with `aria-hidden`.
* Tabs carry explicit accessible names (including pinned state), advertise their keyboard shortcuts via `aria-keyshortcuts`, and toggle buttons expose their state via `aria-pressed`.
* Tabs in the [tab selection](../README.md#selecting-and-moving-several-tabs) carry the accessible description "Selected for move" (`aria-description`, translatable as `I18nLabel.Selected_For_Move`); `aria-selected` stays reserved for the shown tab.
* Group pills are exposed as disclosure buttons (`role="button"` with `aria-expanded`) named after the group.

## Keyboard operation

| Context | Keys | Action                                                                         |
| --- | --- |--------------------------------------------------------------------------------|
| Tabs | Arrow keys | Move focus between tabs in a tabset                                            |
| Tabs | Enter / Space | Select the focused tab                                                         |
| Tabs | Ctrl+Delete (default, rebindable) | Close the focused tab (when it is closeable)                                   |
| Tabs | F2 (default, rebindable) | Rename the focused tab (when it is renameable)                                 |
| Tabs | `focusTabToggle` binding (off by default) | Toggle focus between the selected tab button and its content                   |
| Tabs | Shift+ArrowLeft / Shift+ArrowRight (default, rebindable) | Extend the [tab selection](../README.md#selecting-and-moving-several-tabs) to the previous / next tab |
| Tabs | Mod+Enter (default, rebindable) | Add the focused tab to the tab selection or remove it                          |
| Layout | Escape (default, rebindable) | Clear the tab selection (when pressed within the layout)                       |
| Group pills | Enter / Space | Collapse or expand the focused group                                           |
| Group pills | ContextMenu / Shift+F10 | Open the group menu (rename, color, collapse/expand, ungroup)                  |
| Layout | `focusNextTabset` / `focusPreviousTabset` bindings (off by default) | Move focus to the next / previous tabset, mapped to Ctrl+[, Ctrl+] in the demo |
| Layout | `nextArea` / `previousArea` (F6 / Shift+F6, `tabNavigation="areas"` only) | Move focus to the next / previous area's shown tab, also from inside tab content or a splitter |
| Tabs | Tab / Shift+Tab (`tabNavigation="areas"` only) | Move focus to the next / previous area's shown tab or splitter, then the border toolbar buttons |
| Tabs | Home / End (`tabNavigation="areas"` only) | Move focus to the first / last tab in the tabset |
| Tabs | `enterArea` (Enter, `tabNavigation="areas"` only) | Show the tab and move focus into its content |
| Tab content | Tab / Shift+Tab (`tabNavigation="areas"` only) | Past the last focusable element: the next stop; before the first: the panel's own tab |
| Tab content | `exitArea` (Escape, `tabNavigation="areas"` only) | Return focus to the panel's tab, unless the content handled the key |
| Splitters | Arrow keys | Resize                                                                         |
| Splitters | Tab / Shift+Tab (`tabNavigation="areas"` only) | Move focus to the next / previous stop                                         |
| Overlay borders | Escape (default, rebindable) | Close the open overlay panel (focus returns to the border tab)                 |
| Menus | Arrow keys, Home / End, type a letter | Move between items                                                             |
| Menus | Enter / Space | Activate the focused item                                                      |
| Menus | Escape / Tab | Close and return focus to the trigger                                          |

## Configurable shortcuts (the `keyMap` prop)

The command shortcuts above are configured through the `keyMap` layout prop. Bindings are merged over the exported `defaultKeyMap`, and passing an explicit `undefined` for a binding disables that shortcut (WCAG 2.1.4 requires shortcuts to be remappable or off):

```tsx
<Layout
    model={model}
    factory={factory}
    keyMap={{ focusTabToggle: "F6", focusNextTabset: "Ctrl+]", focusPreviousTabset: "Ctrl+[" }}
/>
```

* A binding is a `KeyboardEvent.key` name, optionally prefixed with the modifiers Ctrl, Shift, Alt or Meta joined with `+` — e.g. `"F2"`, `"Escape"`, `"Ctrl+Delete"`, `"Ctrl+]"`. `Mod` stands for Meta (Cmd) on Apple platforms and Ctrl elsewhere, e.g. `"Mod+Enter"`. Prefer function keys or modifier combinations: WCAG 2.1.4 requires single printable-character shortcuts to be remappable or off by default.
* The configured bindings are advertised to assistive technology via `aria-keyshortcuts` (on the tab buttons, tab panels and tablists), so the advertised shortcuts always match the configured ones.
* `defaultKeyMap` is exported so an application can display the bindings (e.g. in a keyboard-help dialog) or register them with its own shortcut manager.
* The structural keys of the ARIA widget patterns (arrow keys within a tablist, Enter/Space activation, menu navigation, splitter arrows) are fixed and not remappable — assistive technology announces these from the widget roles themselves.
* Pressing Enter on an already selected tab also moves focus into its content (in addition to the optional `focusTabToggle` binding).
* Maximizing or restoring a tabset (toolbar button, double-click on the tab strip or `Actions.maximizeToggle`) while focus is on its tab strip or toolbar moves focus to its shown tab, as the tabset is re-rendered.

## Area navigation (the `tabNavigation` prop)

With `tabNavigation="areas"` the Tab key moves between areas (tabsets with the splitters between them, then borders, then the toolbar buttons of every shown border) instead of through every focusable element, Enter steps into a tab's content and Escape steps back out; see [Moving Between Areas with the Keyboard](../README.md#moving-between-areas-with-the-keyboard) for the full behaviour.

* The tab roles are unchanged. Only the tab button of the area that last had focus (else the first area) has `tabindex="0"`, so the layout is a single stop for Tab entering it from outside, and Tab from outside is redirected to that tab even when the first focusable element in the document order is elsewhere in the layout.
* Tab content panels keep `tabindex="-1"` and receive focus themselves when they contain nothing focusable. A tabset without a tab strip or without tabs is entered straight into its content; an empty tabset's content gets `tabindex="-1"` so it can be focused when its placeholder has nothing focusable.
* Splitters keep their `separator` role and arrow keys; in this mode they are Tab stops between the areas they separate.
* Floating panels are not areas and are not reached by Tab in this mode; once focus is inside one (e.g. after a click), Tab moves through its contents as usual.
* The area bindings are advertised via `aria-keyshortcuts`: `enterArea` on the tab buttons, `nextArea` / `previousArea` on the tablists, and `exitArea`, `nextArea` / `previousArea` on the tab panels.
* Escape inside content is left alone when the event was already handled (`defaultPrevented`), so menus, editors and dialogs keep it. Portaled popovers and dialogs are outside the layout's DOM and never trigger it.

## Focus styling

The bundled themes draw a visible focus outline driven by the `--fl-color-focus` CSS variable (overridable globally via `--flexlayout-color-focus`). Override it (alongside the other theme CSS variables) to match your design system.

## Reusable menu for application context menus

The accessible menu control used for tab overflow is also exported for your own context menus, so they get the same keyboard and ARIA behaviour. It has no dependency on the layout model and can be used declaratively (`<PopupMenu>`) or imperatively (`showPopupMenu(...)`, e.g. from the `onContextMenu` layout prop).
