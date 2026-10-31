import { test, expect, Page } from "@playwright/test";
import { findPath, waitForBox, waitForPopout } from "./helpers";

const load = async (page: Page) => {
    await page.goto("/demo?layout=test_area_navigation");
    await waitForBox(findPath(page, "/r1/ts1"), "third tabset");
};

const tab = (page: Page, name: string) => page.getByRole("tab", { name, exact: true });

// where focus is relative to the layout: "before", "inside" or "after"
const focusRelativeToLayout = (page: Page) =>
    page.evaluate(() => {
        const layout = document.querySelector(".flexlayout__layout")!;
        const active = document.activeElement!;
        if (layout.contains(active)) {
            return "inside";
        }
        return layout.compareDocumentPosition(active) & Node.DOCUMENT_POSITION_PRECEDING ? "before" : "after";
    });

test.describe("area keyboard navigation", () => {
    test("Tab moves between the areas' shown tabs, then the border toolbar, then out of the layout", async ({ page }) => {
        await load(page);
        // the demo has nothing focusable after the layout, so add a button there
        await page.evaluate(() => {
            const button = document.createElement("button");
            button.textContent = "After layout";
            document.querySelector(".flexlayout__layout")!.after(button);
        });
        await tab(page, "Form A").focus();
        await page.keyboard.press("Tab");
        await expect(tab(page, "Form B")).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(tab(page, "Plain C")).toBeFocused();
        // the app button inside the tab button is skipped
        await page.keyboard.press("Tab");
        await expect(tab(page, "Log")).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(page.getByRole("button", { name: "Add panel" })).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(page.getByRole("button", { name: "Layout", exact: true })).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(page.getByRole("button", { name: "After layout" })).toBeFocused();
    });

    test("Shift+Tab walks back and leaves before the layout from the first area", async ({ page }) => {
        await load(page);
        await page.getByRole("button", { name: "Add panel" }).focus();
        await page.keyboard.press("Shift+Tab");
        await expect(tab(page, "Log")).toBeFocused();
        await page.keyboard.press("Shift+Tab");
        await expect(tab(page, "Plain C")).toBeFocused();
        await page.keyboard.press("Shift+Tab");
        await expect(tab(page, "Form B")).toBeFocused();
        await page.keyboard.press("Shift+Tab");
        await expect(tab(page, "Form A")).toBeFocused();
        await page.keyboard.press("Shift+Tab");
        await expect.poll(() => focusRelativeToLayout(page)).toBe("before");
    });

    test("Tab from outside enters on the area that last had focus, else the first", async ({ page }) => {
        await load(page);
        const layoutSelect = page.getByRole("combobox", { name: "Layout" });
        await layoutSelect.focus();
        await page.keyboard.press("Tab");
        // the toolbar controls between the select and the layout come first
        for (let i = 0; i < 20 && (await focusRelativeToLayout(page)) === "before"; i++) {
            await page.keyboard.press("Tab");
        }
        await expect(tab(page, "Form A")).toBeFocused();

        await tab(page, "Form B").click();
        await page.getByRole("textbox", { name: "Form B field" }).click();
        await layoutSelect.focus();
        for (let i = 0; i < 20 && (await focusRelativeToLayout(page)) === "before"; i++) {
            await page.keyboard.press("Tab");
        }
        await expect(tab(page, "Form B")).toBeFocused();
        // only the current area's tab is in the browser's tab sequence
        await expect(tab(page, "Form B")).toHaveAttribute("tabindex", "0");
        await expect(tab(page, "Form A")).toHaveAttribute("tabindex", "-1");

        // Shift+Tab from after the layout enters on the same area
        await page.evaluate(() => {
            const button = document.createElement("button");
            button.textContent = "After layout";
            document.querySelector(".flexlayout__layout")!.after(button);
        });
        await page.getByRole("button", { name: "After layout" }).focus();
        await page.keyboard.press("Shift+Tab");
        await expect(tab(page, "Form B")).toBeFocused();
    });

    test("Enter moves into the content, Tab leaves it to the next area, Shift+Tab and Escape return to the tab", async ({ page }) => {
        await load(page);
        await tab(page, "Form A").focus();
        await page.keyboard.press("Enter");
        const field = page.getByRole("textbox", { name: "Form A field" });
        await expect(field).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(page.getByRole("button", { name: "Form A button" })).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(tab(page, "Form B")).toBeFocused();

        await tab(page, "Form A").focus();
        await page.keyboard.press("Enter");
        await expect(field).toBeFocused();
        await page.keyboard.press("Shift+Tab");
        await expect(tab(page, "Form A")).toBeFocused();

        await page.keyboard.press("Enter");
        await page.keyboard.press("Tab");
        await page.keyboard.press("Escape");
        await expect(tab(page, "Form A")).toBeFocused();
    });

    test("Enter on a tab without focusable content focuses the content itself", async ({ page }) => {
        await load(page);
        await tab(page, "Plain C").focus();
        await page.keyboard.press("Enter");
        await expect(findPath(page, "/r1/ts1/t0")).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(tab(page, "Log")).toBeFocused();
    });

    test("Enter on a collapsed border tab opens it and moves into its content", async ({ page }) => {
        await load(page);
        await tab(page, "Log").focus();
        await page.keyboard.press("Enter");
        await expect(tab(page, "Log")).toHaveAttribute("aria-selected", "true");
        await expect(page.getByRole("textbox", { name: "Log field" })).toBeFocused();
        await page.keyboard.press("Escape");
        await expect(tab(page, "Log")).toBeFocused();
        await expect(tab(page, "Log")).toHaveAttribute("aria-selected", "true");
    });

    test("F6 and Shift+F6 cycle the areas from tabs and from content", async ({ page }) => {
        await load(page);
        await tab(page, "Form A").focus();
        await page.keyboard.press("Enter");
        await page.keyboard.press("F6");
        await expect(tab(page, "Form B")).toBeFocused();
        await page.keyboard.press("F6");
        await page.keyboard.press("F6");
        await expect(tab(page, "Log")).toBeFocused();
        await page.keyboard.press("F6");
        await expect(tab(page, "Form A")).toBeFocused();
        await page.keyboard.press("Shift+F6");
        await expect(tab(page, "Log")).toBeFocused();
    });

    test("arrow keys switch focus within a strip and Home / End reach its ends", async ({ page }) => {
        await load(page);
        await tab(page, "Form A").focus();
        await page.keyboard.press("ArrowRight");
        await expect(tab(page, "Plain A")).toBeFocused();
        await page.keyboard.press("End");
        await expect(tab(page, "Third A")).toBeFocused();
        await page.keyboard.press("Home");
        await expect(tab(page, "Form A")).toBeFocused();
        // Enter on a tab that is not shown shows it and moves into its content
        await page.keyboard.press("End");
        await page.keyboard.press("Enter");
        await expect(tab(page, "Third A")).toHaveAttribute("aria-selected", "true");
        await expect(findPath(page, "/ts0/t2")).toBeFocused();
    });

    test("F2 still renames the focused tab", async ({ page }) => {
        await load(page);
        await tab(page, "Form A").focus();
        await page.keyboard.press("F2");
        await expect(findPath(page, "/ts0/tb0/textbox")).toBeFocused();
        await page.keyboard.press("Escape");
        await expect(tab(page, "Form A")).toBeFocused();
    });

    test("a popout window moves between its own areas", async ({ page, context }) => {
        await load(page);
        await page.evaluate(() => {
            const w = window as any;
            w.__flexDispatch(w.__flexActions.popoutTabset(w.__flexModel().getNodeById("form_b").getParent().getId(), "window"));
        });
        const popout = await waitForPopout(context, page);
        await expect(tab(popout, "Form B")).toBeVisible();
        await tab(popout, "Form B").focus();
        await popout.keyboard.press("Enter");
        await expect(popout.getByRole("textbox", { name: "Form B field" })).toBeFocused();
        await popout.keyboard.press("F6");
        await expect(tab(popout, "Form B")).toBeFocused();

        // the main window's areas no longer include the popped out tabset
        await tab(page, "Form A").focus();
        await page.keyboard.press("Tab");
        await expect(tab(page, "Plain C")).toBeFocused();
    });
});
