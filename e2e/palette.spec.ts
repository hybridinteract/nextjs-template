import { test, expect } from "@playwright/test";
import { signIn } from "./fixtures/helpers";

// The command palette: the keyboard's way round the app, and the only place a
// person can switch the theme.

test("Ctrl+K opens the palette, and picking a page goes there", async ({ page }) => {
  await signIn(page);
  await page.goto("/dashboard/design");

  await page.keyboard.press("Control+k");
  const palette = page.getByRole("dialog", { name: "Search" });
  await expect(palette).toBeVisible();

  await palette.getByPlaceholder("Search pages and actions…").fill("Dashboard");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(palette).toHaveCount(0);
});

test("the palette switches the theme", async ({ page }) => {
  await signIn(page);
  await page.getByRole("button", { name: "Search or jump to a page" }).first().click();
  await page.getByRole("option", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
});
