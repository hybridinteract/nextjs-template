import { test, expect } from "@playwright/test";
import { signIn, goToList, visibleText } from "./fixtures/helpers";

// Layout tests, so they only mean anything in a real browser. jsdom has no
// layout engine: it would report every element as 0x0 and pass regardless.

async function open(page: Parameters<typeof signIn>[0]) {
  await signIn(page);
  await goToList(page);
  await expect(visibleText(page, "47 widgets")).toBeVisible();
}

test("the page never scrolls sideways", async ({ page }) => {
  // The reason DataTable has a card layout at all. A wide table on a 375px
  // screen used to push the whole document out and take the nav with it.
  await open(page);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1); // 1px of rounding is fine
});

test("rows are a table on desktop and cards on mobile", async ({ page }, testInfo) => {
  await open(page);
  const table = page.locator("table");

  // Asserted structurally rather than by text: the card labels are uppercased in
  // CSS, so the DOM still says "Status" and a getByText("STATUS") would never
  // match however the layout renders.
  const cardFields = page.locator("dl");

  if (testInfo.project.name === "mobile") {
    await expect(table).toBeHidden();
    await expect(cardFields.first()).toBeVisible();
  } else {
    await expect(table).toBeVisible();
    await expect(cardFields.first()).toBeHidden();
  }
});

test("the modal is a side panel on desktop and a bottom sheet on mobile", async ({ page }, testInfo) => {
  await open(page);
  await visibleText(page, "Widget 05").first().click();
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
