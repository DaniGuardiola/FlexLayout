import { test, expect, Page } from "@playwright/test";
import { waitForBox } from "./helpers";

// scrollOnOverflow: the main area scrolls once its tabsets' minimum sizes no longer fit, while the
// borders stay in place; tab panels follow the scroll, clipped to the visible part of the main area

const ts = (name: string) => ({
    type: "tabset",
    weight: 1,
    children: [{ type: "tab", name, component: "text", config: { text: name } }],
});

const crowded = () => ({
    global: { tabSetMinWidth: 220, tabSetMinHeight: 260 },
    borders: [{ type: "border", location: "bottom", children: [{ type: "tab", name: "Footer", component: "text" }] }],
    layout: {
        type: "row",
        children: [ts("A"), ts("B"), { type: "row", weight: 1, children: [ts("C"), ts("D"), ts("E")] }, ts("F"), ts("G")],
    },
});

const gotoLayout = async (page: Page, name: string, json: unknown) => {
    await page.setViewportSize({ width: 900, height: 600 });
    await page.addInitScript(
        ({ name, json }) => {
            localStorage.setItem(name, JSON.stringify(json));
        },
        { name, json },
    );
    await page.goto("/demo?layout=" + name);
    await page.waitForSelector(".flexlayout__tabset");
    await waitForBox(page.locator(".flexlayout__layout").first(), "main layout");
};

const scroller = (page: Page) => page.locator(".flexlayout__layout_main_scroller");

/** a tab panel's box and clip, with its tabset's content box, all in client coordinates */
const panelGeometry = (page: Page, name: string) =>
    page.evaluate((name) => {
        const button = [...document.querySelectorAll<HTMLElement>(".flexlayout__tab_button")].find((el) => el.textContent?.trim() === name)!;
        const panel = document.getElementById(button.getAttribute("aria-controls")!)!;
        const content = button.closest(".flexlayout__tabset")!.querySelector<HTMLElement>(".flexlayout__tabset_content")!;
        const box = (el: Element) => {
            const r = el.getBoundingClientRect();
            return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
        };
        return { panel: box(panel), content: box(content), clip: panel.style.clipPath };
    }, name);

test("scrolls the main area instead of squeezing tabsets, keeping the border in place", async ({ page }) => {
    await gotoLayout(page, "test_scroll_crowded", crowded());
    const metrics = await scroller(page).evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth, sh: el.scrollHeight, ch: el.clientHeight }));
    expect(metrics.sw).toBeGreaterThan(metrics.cw);
    expect(metrics.sh).toBeGreaterThan(metrics.ch);
    const widths = await page.$$eval(".flexlayout__tabset_container", (els) => els.map((el) => el.getBoundingClientRect().width));
    for (const width of widths) {
        expect(width).toBeGreaterThanOrEqual(219);
    }

    const border = page.locator(".flexlayout__border_bottom").first();
    const before = await waitForBox(border, "bottom border");
    await scroller(page).evaluate((el) => el.scrollTo({ left: 400, top: 300, behavior: "instant" }));
    await page.waitForTimeout(100);
    const after = await waitForBox(border, "bottom border");
    expect(after).toEqual(before);

    // panels follow their tabsets, and those partly out of view are clipped to the main area
    const a = await panelGeometry(page, "A");
    expect(a.panel.x).toBe(a.content.x);
    expect(a.panel.y).toBe(a.content.y);
    expect(a.clip).toMatch(/^inset\(/);
    const g = await panelGeometry(page, "G");
    expect(g.panel.x).toBe(g.content.x);
});

test("moves focus into a panel scrolled out of view by scrolling to it", async ({ page }) => {
    await gotoLayout(page, "test_scroll_focus", crowded());
    const g = await panelGeometry(page, "G");
    const viewport = await scroller(page).evaluate((el) => el.getBoundingClientRect().right);
    expect(g.panel.x).toBeGreaterThan(viewport);
    await page.evaluate(() => {
        const button = [...document.querySelectorAll<HTMLElement>(".flexlayout__tab_button")].find((el) => el.textContent?.trim() === "G")!;
        document.getElementById(button.getAttribute("aria-controls")!)!.focus();
    });
    await page.waitForTimeout(100);
    const moved = await panelGeometry(page, "G");
    expect(moved.panel.x + moved.panel.width).toBeLessThanOrEqual(viewport + 1);
    expect(moved.panel.x).toBe(moved.content.x);
    // the page itself never scrolls
    expect(await page.evaluate(() => [window.scrollX, window.scrollY])).toEqual([0, 0]);
});

test("keeps the main area at its size without scrollOnOverflow", async ({ page }) => {
    await gotoLayout(page, "plain_crowded", crowded());
    expect(await page.locator(".flexlayout__layout_main_scroller").count()).toBe(0);
});
