import { test, expect } from "@playwright/test";
import { signIn } from "./fixtures/helpers";

// The auth chain is the one thing in this template that was broken for months
// without anyone noticing, because it fails identically to "the backend is down".
// These are the checks that would have caught it.

test("an unauthenticated visit to /dashboard bounces to login, carrying the way back", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard/);
});

test("the login form validates before it calls anything", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Invalid email address")).toBeVisible();
});

test("signing in reaches the dashboard", async ({ page }) => {
  await signIn(page);
});

test("an authenticated API call reaches the backend through the proxy", async ({ page }) => {
  // The bug: the client called the backend origin directly, so the httpOnly
  // cookie never travelled and this 404'd or 401'd. Same-origin is the fix, and
  // this is what proves it.
  await signIn(page);

  const res = await page.request.get("/api/v1/auth/me");
  expect(res.status()).toBe(200);
  expect((await res.json()).email).toBe("test@example.com");
});

test("an unknown route renders the not-found boundary, not a blank page", async ({ page }) => {
  await page.goto("/no-such-page");
  await expect(page.getByText("Page not found")).toBeVisible();
});
