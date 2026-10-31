import { test, expect, Page } from "@playwright/test";
import { findPath, findTabButton, drag, Location, waitForBox } from "./helpers";

const MULTI = /flexlayout__tab_button--multi-selected/;

const load = async (page: Page) => {
    await page.goto("/demo?layout=test_multi_select");
    await waitForBox(findPath(page, "/ts1"), "second tabset");
};

// the tab names of each tabset, in layout order
const tabsetNames = (page: Page) =>
    page.evaluate(() =>
        Array.from(document.querySelectorAll(".flexlayout__tabset")).map((tabset) => Array.from(tabset.querySelectorAll(".flexlayout__tab_button_content")).map((content) => content.textContent)),
    );

const multiSelectedNames = (page: Page) =>
    page.evaluate(() =>
        Array.from(document.querySelectorAll(".flexlayout__tab_button--multi-selected, .flexlayout__border_button--multi-selected")).map(
            (button) => button.querySelector(".flexlayout__tab_button_content, .flexlayout__border_button_content")?.textContent,
        ),
    );

const undoCount = async (page: Page) => Number((await page.locator('button[title^="undo"]').getAttribute("title"))!.match(/\d+/)![0]);

test.describe("tab multi-select", () => {
    test("Cmd/Ctrl click pairs with the last clicked tab, then toggles", async ({ page }) => {
        await load(page);
        await findTabButton(page, "/ts0", 0).click();
        await findTabButton(page, "/ts0", 2).click({ modifiers: ["ControlOrMeta"] });
        await expect.poll(() => multiSelectedNames(page)).toEqual(["One", "Three"]);
        // the shown tab does not change
        await expect(findTabButton(page, "/ts0", 0)).toHaveClass(/flexlayout__tab_button--selected/);

        await findTabButton(page, "/ts1", 1).click({ modifiers: ["ControlOrMeta"] });
        await expect.poll(() => multiSelectedNames(page)).toEqual(["One", "Three", "Six"]);
        await findTabButton(page, "/ts0", 0).click({ modifiers: ["ControlOrMeta"] });
        await expect.poll(() => multiSelectedNames(page)).toEqual(["Three", "Six"]);
        await findTabButton(page, "/ts0", 2).click({ modifiers: ["ControlOrMeta"] });
        await expect.poll(() => multiSelectedNames(page)).toEqual([]);
    });

    test("Shift click selects a range within one tabset", async ({ page }) => {
        await load(page);
        await findTabButton(page, "/ts0", 1).click();
        await findTabButton(page, "/ts0", 3).click({ modifiers: ["Shift"] });
        await expect.poll(() => multiSelectedNames(page)).toEqual(["Two", "Three", "Four"]);
        // in another tabset the range starts from that tabset's shown tab
        await findTabButton(page, "/ts1", 1).click({ modifiers: ["Shift"] });
        await expect.poll(() => multiSelectedNames(page)).toEqual(["Five", "Six"]);
    });

    test("plain click, Escape and a click on empty space clear the selection", async ({ page }) => {
        await load(page);
        await findTabButton(page, "/ts0", 0).click();
        await findTabButton(page, "/ts0", 1).click({ modifiers: ["Shift"] });
        await expect.poll(() => multiSelectedNames(page)).toEqual(["One", "Two"]);
        await findTabButton(page, "/ts0", 3).click();
        await expect.poll(() => multiSelectedNames(page)).toEqual([]);
        await expect(findTabButton(page, "/ts0", 3)).toHaveClass(/flexlayout__tab_button--selected/);

        await findTabButton(page, "/ts0", 0).click({ modifiers: ["Shift"] });
        await expect.poll(() => multiSelectedNames(page)).toHaveLength(4);
        await page.keyboard.press("Escape");
        await expect.poll(() => multiSelectedNames(page)).toEqual([]);

        await findTabButton(page, "/ts0", 1).click({ modifiers: ["ControlOrMeta"] });
        await expect.poll(() => multiSelectedNames(page)).toEqual(["Two", "Four"]);
        // the empty tabstrip space after the last tab
        const lastTab = await waitForBox(findTabButton(page, "/ts0", 3), "last tab");
        await page.mouse.click(lastTab.x + lastTab.width + 20, lastTab.y + lastTab.height / 2);
        await expect.poll(() => multiSelectedNames(page)).toEqual([]);
    });

    test("dragging a selected tab moves the whole selection in one undo step", async ({ page }) => {
        await load(page);
        await findTabButton(page, "/ts0", 1).click();
        await findTabButton(page, "/ts0", 3).click({ modifiers: ["ControlOrMeta"] });
        const before = await undoCount(page);

        await drag(page, findTabButton(page, "/ts0", 3), findPath(page, "/ts1/t0"), Location.CENTER);

        await expect
            .poll(() => tabsetNames(page))
            .toEqual([
                ["One", "Three"],
                ["Five", "Six", "Two", "Four"],
            ]);
        // the grabbed tab is shown where the tabs land, the selection stays
        await expect(findTabButton(page, "/ts1", 3)).toHaveClass(/flexlayout__tab_button--selected/);
        await expect.poll(() => multiSelectedNames(page)).toEqual(["Two", "Four"]);
        expect(await undoCount(page)).toBe(before + 1);

        await page.locator('button[title^="undo"]').click();
        await expect
            .poll(() => tabsetNames(page))
            .toEqual([
                ["One", "Two", "Three", "Four"],
                ["Five", "Six"],
            ]);
    });

    test("dragging an unselected tab moves only it and keeps the selection", async ({ page }) => {
        await load(page);
        await findTabButton(page, "/ts0", 0).click();
        await findTabButton(page, "/ts0", 1).click({ modifiers: ["ControlOrMeta"] });

        await drag(page, findTabButton(page, "/ts0", 3), findPath(page, "/ts1/t0"), Location.CENTER);

        await expect
            .poll(() => tabsetNames(page))
            .toEqual([
                ["One", "Two", "Three"],
                ["Five", "Six", "Four"],
            ]);
        await expect.poll(() => multiSelectedNames(page)).toEqual(["One", "Two"]);
    });

    test("dragging a selection to a tabset edge moves it into one new tabset", async ({ page }) => {
        await load(page);
        await findTabButton(page, "/ts0", 2).click();
        await findTabButton(page, "/ts1", 1).click({ modifiers: ["ControlOrMeta"] });

        await drag(page, findTabButton(page, "/ts1", 1), findPath(page, "/ts1/t0"), Location.BOTTOM);

        await expect.poll(async () => (await tabsetNames(page)).sort()).toEqual([["Five"], ["One", "Two", "Four"], ["Three", "Six"]].sort());
        await expect(page.locator(".flexlayout__tab_button--selected", { hasText: "Six" })).toHaveCount(1);
    });

    test("border tabs can be selected and moved together", async ({ page }) => {
        await load(page);
        await findTabButton(page, "/border/left", 0).click();
        await findTabButton(page, "/border/left", 1).click({ modifiers: ["ControlOrMeta"] });
        await expect.poll(() => multiSelectedNames(page)).toEqual(["L1", "L2"]);
        await expect(findTabButton(page, "/border/left", 1)).toHaveClass(/flexlayout__border_button--multi-selected/);

        await drag(page, findTabButton(page, "/border/left", 1), findPath(page, "/ts1/t0"), Location.CENTER);

        await expect
            .poll(() => tabsetNames(page))
            .toEqual([
                ["One", "Two", "Three", "Four"],
                ["Five", "Six", "L1", "L2"],
            ]);
    });

    test("a selection of tabset and border tabs lands with the tabset tabs first", async ({ page }) => {
        await load(page);
        await findTabButton(page, "/border/left", 0).click();
        await findTabButton(page, "/ts0", 1).click({ modifiers: ["ControlOrMeta"] });
        await expect.poll(() => multiSelectedNames(page)).toEqual(["L1", "Two"]);

        await drag(page, findTabButton(page, "/ts0", 1), findPath(page, "/ts1/t0"), Location.CENTER);

        await expect
            .poll(() => tabsetNames(page))
            .toEqual([
                ["One", "Three", "Four"],
                ["Five", "Six", "Two", "L1"],
            ]);
    });

    test("Shift+Arrow keys extend the selection and Cmd/Ctrl+Enter toggles without showing the tab", async ({ page }) => {
        await load(page);
        await findTabButton(page, "/ts0", 0).click();
        await page.keyboard.press("Shift+ArrowRight");
        await expect.poll(() => multiSelectedNames(page)).toEqual(["One", "Two"]);
        await expect(findTabButton(page, "/ts0", 1)).toBeFocused();
        await page.keyboard.press("Shift+ArrowRight");
        await expect.poll(() => multiSelectedNames(page)).toEqual(["One", "Two", "Three"]);
        await page.keyboard.press("Shift+ArrowLeft");
        await expect.poll(() => multiSelectedNames(page)).toEqual(["One", "Two"]);

        await page.keyboard.press("ArrowRight");
        await page.keyboard.press("ArrowRight");
        await expect(findTabButton(page, "/ts0", 3)).toBeFocused();
        await page.keyboard.press("ControlOrMeta+Enter");
        await expect.poll(() => multiSelectedNames(page)).toEqual(["One", "Two", "Four"]);
        await expect(findTabButton(page, "/ts0", 0)).toHaveClass(/flexlayout__tab_button--selected/);
        await expect(findTabButton(page, "/ts0", 3)).toHaveClass(/flexlayout__tab_button--unselected/);
        await page.keyboard.press("ControlOrMeta+Enter");
        await expect.poll(() => multiSelectedNames(page)).toEqual(["One", "Two"]);
        await expect(findTabButton(page, "/ts0", 3)).not.toHaveClass(MULTI);
    });

    test("Cmd/Ctrl+Enter pairs with the last keyboard activated tab, not the last clicked one", async ({ page }) => {
        await load(page);
        await findTabButton(page, "/ts0", 0).click();
        await findTabButton(page, "/ts1", 0).focus();
        await page.keyboard.press("ArrowRight");
        await page.keyboard.press("Enter");
        await expect(findTabButton(page, "/ts1", 1)).toHaveClass(/flexlayout__tab_button--selected/);
        await findTabButton(page, "/ts0", 2).focus();
        await page.keyboard.press("ControlOrMeta+Enter");
        await expect.poll(() => multiSelectedNames(page)).toEqual(["Three", "Six"]);
    });

    test("selected tabs are described to assistive technology", async ({ page }) => {
        await load(page);
        await findTabButton(page, "/ts0", 0).click();
        await findTabButton(page, "/border/left", 1).click({ modifiers: ["ControlOrMeta"] });
        await expect.poll(() => multiSelectedNames(page)).toEqual(["L2", "One"]);
        await expect(findTabButton(page, "/ts0", 0)).toHaveAttribute("aria-description", "Selected for move");
        await expect(findTabButton(page, "/border/left", 1)).toHaveAttribute("aria-description", "Selected for move");
        await expect(findTabButton(page, "/ts0", 1)).not.toHaveAttribute("aria-description");
    });

    test("Escape outside the layout keeps the selection", async ({ page }) => {
        await load(page);
        await findTabButton(page, "/ts0", 0).click();
        await findTabButton(page, "/ts0", 1).click({ modifiers: ["Shift"] });
        await expect.poll(() => multiSelectedNames(page)).toEqual(["One", "Two"]);
        await page.getByRole("combobox", { name: "Layout" }).focus();
        await page.keyboard.press("Escape");
        await expect.poll(() => multiSelectedNames(page)).toEqual(["One", "Two"]);
    });

    test("closing tabs drops them from the selection", async ({ page }) => {
        await load(page);
        await findTabButton(page, "/ts0", 0).click();
        await findTabButton(page, "/ts0", 2).click({ modifiers: ["Shift"] });
        await expect.poll(() => multiSelectedNames(page)).toEqual(["One", "Two", "Three"]);
        await findTabButton(page, "/ts0", 1).hover();
        await findPath(page, "/ts0/tb1/button/close").click();
        await expect.poll(() => multiSelectedNames(page)).toEqual(["One", "Three"]);
        await findTabButton(page, "/ts0", 0).hover();
        await findPath(page, "/ts0/tb0/button/close").click();
        await expect.poll(() => multiSelectedNames(page)).toEqual([]);
    });
});

test.describe("without the tabSelection prop", () => {
    test("Cmd/Ctrl and Shift clicks and the selection keys select nothing", async ({ page }) => {
        await page.goto("/demo?layout=test_two_tabs");
        await waitForBox(findPath(page, "/ts1"), "second tabset");
        await findTabButton(page, "/ts0", 0).click();
        await findTabButton(page, "/ts1", 0).click({ modifiers: ["ControlOrMeta"] });
        await findTabButton(page, "/ts0", 0).click({ modifiers: ["Shift"] });
        await page.keyboard.press("ControlOrMeta+Enter");
        await page.keyboard.press("Shift+ArrowRight");
        await expect(page.locator(".flexlayout__tab_button--multi-selected")).toHaveCount(0);
        await expect(findTabButton(page, "/ts0", 0)).not.toHaveAttribute("aria-keyshortcuts", /Enter|Shift/);
    });
});
