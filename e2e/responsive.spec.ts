import { test, expect, type Page } from "@playwright/test";

// Layout tests, so they only mean anything in a real browser. jsdom has no
// layout engine: it would report every element as 0x0 and pass regardless.

async function goToList(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("test@example.com");
  await page.getByLabel("Password").fill("hunter2");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto("/dashboard/__fixtures__");
  await expect(page.getByText("47 widgets")).toBeVisible();
}

test("the page never scrolls sideways", async ({ page }) => {
  // The reason DataTable has a card layout at all. A wide table on a 375px
  // screen used to push the whole document out and take the nav with it.
  await goToList(page);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1); // 1px of rounding is fine
});

test("rows are a table on desktop and cards on mobile", async ({ page }, testInfo) => {
  await goToList(page);
  const table = page.locator("table");

  if (testInfo.project.name === "mobile") {
    await expect(table).toBeHidden();
    await expect(page.getByText("STATUS").first()).toBeVisible(); // a card field label
  } else {
    await expect(table).toBeVisible();
  }
});

test("the modal is a side panel on desktop and a bottom sheet on mobile", async ({ page }, testInfo) => {
  await goToList(page);
  await page.getByText("Widget 05", { exact: true }).first().click();
  const heading = page.getByRole("heading", { name: "Widget 05" });
  await expect(heading).toBeVisible();

  const panel = page.locator("body > div.fixed.inset-0 [class*='max-h-']").first();
  const box = await panel.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box).not.toBeNull();

  if (testInfo.project.name === "mobile") {
    // A sheet: full width, anchored to the bottom.
    expect(box!.width).toBeGreaterThan(viewport.width * 0.9);
    expect(box!.y + box!.height).toBeGreaterThan(viewport.height * 0.9);
  } else {
    // A panel: part width, against the right edge.
    expect(box!.width).toBeLessThan(viewport.width * 0.9);
    expect(box!.x + box!.width).toBeGreaterThan(viewport.width * 0.5);
  }
});
