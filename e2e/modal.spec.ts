import { test, expect, type Page } from "@playwright/test";
import { signIn, goToList, visibleText, portalCount } from "./fixtures/helpers";

// The Modal is the app's primary editing surface, and the two things worth
// testing about it are both invisible to jsdom: whether it actually leaves the
// DOM after its exit animation, and whether it is a side panel or a bottom sheet.

async function openDetail(page: Page) {
  await signIn(page);
  await goToList(page);
  await visibleText(page, "Widget 05").first().click();
  await expect(page.getByRole("heading", { name: "Widget 05" })).toBeVisible();
}

test("closing a modal removes it from the DOM, not just from view", async ({ page }) => {
  // This is a regression test for a real bug. framer-motion's
  // `onAnimationComplete` never fires in this setup, so the panel slid out of
  // sight and then stayed mounted — one stale subtree per record ever opened.
  // jsdom cannot catch it: it runs no animation, so nothing to complete.
  await openDetail(page);

  await page.getByLabel("Close").click();

  await expect(page.getByRole("heading", { name: "Widget 05" })).toBeHidden();
  await expect.poll(() => portalCount(page), { timeout: 3000 }).toBe(0);
});

test("a select opened inside a modal is on top of it, not behind it", async ({ page }) => {
  // Regression test for a bug Influen shipped from this template. The Modal
  // and every Radix popper portal to document.body, so their z-indexes compete
  // directly. The Modal sat at 100 and the poppers at 50, so a Select inside a
  // panel opened behind it and the panel swallowed the click. The control looked
  // dead. jsdom has no stacking or hit testing, so only a real browser sees it.
  // `option.click()` alone would pass even when the option is buried, because
  // Playwright clicks the element it located. `elementFromPoint` is the check.
  await openDetail(page);

  await page.getByRole("combobox", { name: "Status" }).click();
  const option = page.getByRole("option", { name: "Archived" });
  await expect(option).toBeVisible();

  const box = (await option.boundingBox())!;
  const topmostIsTheOption = await page.evaluate(
    ([x, y]: number[]) =>
      Boolean(document.elementFromPoint(x, y)?.closest("[data-slot='select-item']")),
    [box.x + box.width / 2, box.y + box.height / 2],
  );
  expect(topmostIsTheOption).toBe(true);

  await option.click();
  await expect(page.getByRole("combobox", { name: "Status" })).toHaveText("Archived");
});

test("a dirty modal will not be closed by a stray Escape", async ({ page }) => {
  await openDetail(page);
  await page.getByLabel("Name").fill("Widget 05 edited");

  await page.keyboard.press("Escape");

  await expect(page.getByRole("alertdialog")).toBeVisible();
  await expect(page.getByText("Discard your changes?")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Widget 05" })).toBeVisible();
});

test("Escape on the prompt keeps editing, and the typing survives", async ({ page }) => {
  await openDetail(page);
  await page.getByLabel("Name").fill("Widget 05 edited");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("alertdialog")).toBeVisible();

  await page.keyboard.press("Escape");

  await expect(page.getByRole("alertdialog")).toBeHidden();
  await expect(page.getByLabel("Name")).toHaveValue("Widget 05 edited");
});

test("Discard closes the panel and unmounts it", async ({ page }) => {
  await openDetail(page);
  await page.getByLabel("Name").fill("Widget 05 edited");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Discard" }).click();

  await expect(page.getByRole("heading", { name: "Widget 05" })).toBeHidden();
  await expect.poll(() => portalCount(page), { timeout: 3000 }).toBe(0);
});

test("an untouched modal closes straight away", async ({ page }) => {
  await openDetail(page);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("alertdialog")).toBeHidden();
  await expect(page.getByRole("heading", { name: "Widget 05" })).toBeHidden();
});
