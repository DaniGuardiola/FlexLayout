import { test, expect } from "@playwright/test";
import { findPath, waitForBox, waitForPopout } from "./helpers";

// the layout ref's getNodeForElement / getElementForNode, through the demo's test hooks
test.describe("node lookup", () => {
    test("maps elements to nodes and back in the main window and in a popout window", async ({ page, context }) => {
        await page.goto("/demo?layout=test_area_navigation");
        await waitForBox(findPath(page, "/r1/ts1"), "third tabset");

        const lookup = () =>
            page.evaluate(() => {
                const w = window as any;
                const layout = w.__flexLayout();
                const tab = w.__flexModel().getNodeById("form_b");
                const button = layout.getElementForNode(tab);
                const panel = layout.getElementForNode("form_b", "panel");
                const tabset = layout.getElementForNode(tab.getParent());
                const field = panel.querySelector("input");
                return {
                    inMainDocument: button.ownerDocument === document,
                    buttonLabel: button.getAttribute("aria-label"),
                    fromButton: layout.getNodeForElement(button)?.getId(),
                    fromField: layout.getNodeForElement(field)?.getId(),
                    fromTabset: layout.getNodeForElement(tabset) === tab.getParent(),
                    tabsetHoldsButton: tabset.contains(button),
                    tabsetPanelSameDocument: tabset.ownerDocument === panel.ownerDocument,
                };
            });

        const expected = { buttonLabel: "Form B", fromButton: "form_b", fromField: "form_b", fromTabset: true, tabsetHoldsButton: true, tabsetPanelSameDocument: true };
        expect(await lookup()).toEqual({ ...expected, inMainDocument: true });

        await page.evaluate(() => {
            const w = window as any;
            w.__flexDispatch(w.__flexActions.popoutTabset(w.__flexModel().getNodeById("form_b").getParent().getId(), "window"));
        });
        const popout = await waitForPopout(context, page);
        await expect(popout.getByRole("tab", { name: "Form B", exact: true })).toBeVisible();
        await expect(popout.getByRole("textbox", { name: "Form B field" })).toBeAttached();

        expect(await lookup()).toEqual({ ...expected, inMainDocument: false });
    });
});
