import { test, expect } from "@playwright/test";

// The public site, app/(site). `ncube remove site` deletes this file with it.

test("the home page is public, and its sign-in link reaches the login page", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);

  await page.getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("the public site mounts no toaster, and the login page does", async ({ page }) => {
  // AppProviders (query client, toaster, overlay, session dialog) is mounted by
  // (auth) and (dashboard), not the root layout, so a visitor downloads none of
  // it. Sonner draws its region the moment it mounts, which makes it the thing
  // to look for.
  const toaster = page.getByRole("region", { name: /Notifications/ });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
  await expect(toaster).toHaveCount(0);

  await page.goto("/login");
  await expect(toaster).toHaveCount(1);
});
