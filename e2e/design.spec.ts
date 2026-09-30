import { test, expect } from "@playwright/test";
import { signIn } from "./fixtures/helpers";

// The design page is what people and Claude copy from. If a shared part breaks,
// or the page overflows a phone, every screen built from it inherits the fault.

test("the design page shows every section, and its dialogs open", async ({ page }) => {
  await signIn(page);
  await page.goto("/dashboard/design");

  for (const heading of ["Colour", "Type", "Buttons", "Fields", "Status", "Data", "Feedback", "Dialogs"]) {
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  }

  await page.getByRole("button", { name: "Centred" }).click();
  await expect(page.getByRole("dialog", { name: "New order" })).toBeVisible();
});

test("the design page never scrolls sideways", async ({ page }) => {
  await signIn(page);
  await page.goto("/dashboard/design");
  await expect(page.getByRole("heading", { name: "Dialogs", exact: true })).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
