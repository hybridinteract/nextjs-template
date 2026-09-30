import { test, expect } from "@playwright/test";
import { goToList, signIn } from "./fixtures/helpers";

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

test("signing in fetches the user once, so the sidebar has its menu at once", async ({ page }) => {
  // useLogin fetches /me before it moves to the dashboard, so the sidebar draws
  // its menu on the first paint. (auth) and (dashboard) each mount their own
  // AppProviders, so that only works because QueryProvider keeps one client per
  // tab. With a client per layout, the dashboard starts empty and fetches /me
  // again. Influen has that bug.
  let meCalls = 0;
  page.on("request", (req) => {
    if (new URL(req.url()).pathname === "/api/auth/me") meCalls += 1;
  });

  await signIn(page);
  await page.waitForLoadState("networkidle");
  expect(meCalls).toBe(1);
});

test("signing out does not tell you your session ended", async ({ page, isMobile }) => {
  // Regression test for a bug Influen shipped from this template. Logout drops
  // the cookies and clears the query cache while the dashboard is still mounted.
  // Live queries refetch, get 401s, and each one raised "Your session has ended"
  // on the login page, at someone who had just chosen to leave.
  test.skip(isMobile, "The user menu is inside the nav sheet on a phone. The flag logic is the same.");
  await signIn(page);
  await goToList(page);

  await page.getByRole("button", { name: /test@example\.com/ }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();

  // The 401s land a beat after the navigation, so give them time to arrive.
  // Nothing to wait *for* here: the test is that nothing shows up.
  await page.waitForTimeout(1500);
  await expect(page.getByText("Your session has ended")).toHaveCount(0);
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
