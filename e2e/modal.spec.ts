import { test, expect, type Page } from "@playwright/test";

// The Modal is the app's primary editing surface, and the two things worth
// testing about it are both invisible to jsdom: whether it actually leaves the
// DOM after its exit animation, and whether it is a side panel or a bottom sheet.

async function openDetail(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("test@example.com");
  await page.getByLabel("Password").fill("hunter2");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/dashboard/__fixtures__");
  await page.getByText("Widget 05", { exact: true }).first().click();
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
  await expect
    .poll(() => page.locator("body > div.fixed.inset-0").count(), { timeout: 3000 })
    .toBe(0);
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
  await expect
    .poll(() => page.locator("body > div.fixed.inset-0").count(), { timeout: 3000 })
    .toBe(0);
});

test("an untouched modal closes straight away", async ({ page }) => {
  await openDetail(page);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("alertdialog")).toBeHidden();
  await expect(page.getByRole("heading", { name: "Widget 05" })).toBeHidden();
});
