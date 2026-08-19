# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> signing in reaches the dashboard
- Location: e2e/auth.spec.ts:18:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByLabel('Email')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e5]: Sign in
      - generic [ref=e6]: Enter your credentials to access your account
    - generic [ref=e8]:
      - generic [ref=e9]:
        - generic [ref=e10]:
          - text: Email
          - generic [ref=e11]: "*"
        - textbox "you@example.com" [ref=e12]
      - generic [ref=e13]:
        - generic [ref=e14]:
          - text: Password
          - generic [ref=e15]: "*"
        - textbox [ref=e16]
      - button "Sign in" [ref=e17]
  - region "Notifications alt+T"
  - alert [ref=e18]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | // The auth chain is the one thing in this template that was broken for months
  4  | // without anyone noticing, because it fails identically to "the backend is down".
  5  | // These are the checks that would have caught it.
  6  | 
  7  | test("an unauthenticated visit to /dashboard bounces to login, carrying the way back", async ({ page }) => {
  8  |   await page.goto("/dashboard");
  9  |   await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard/);
  10 | });
  11 | 
  12 | test("the login form validates before it calls anything", async ({ page }) => {
  13 |   await page.goto("/login");
  14 |   await page.getByRole("button", { name: "Sign in" }).click();
  15 |   await expect(page.getByText("Invalid email address")).toBeVisible();
  16 | });
  17 | 
  18 | test("signing in reaches the dashboard", async ({ page }) => {
  19 |   await page.goto("/login");
> 20 |   await page.getByLabel("Email").fill("test@example.com");
     |                                  ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  21 |   await page.getByLabel("Password").fill("hunter2");
  22 |   await page.getByRole("button", { name: "Sign in" }).click();
  23 | 
  24 |   await expect(page).toHaveURL(/\/dashboard/);
  25 | });
  26 | 
  27 | test("an authenticated API call reaches the backend through the proxy", async ({ page, request }) => {
  28 |   // The bug: the client called the backend origin directly, so the httpOnly
  29 |   // cookie never travelled and this 404'd or 401'd. Same-origin is the fix, and
  30 |   // this is what proves it.
  31 |   await page.goto("/login");
  32 |   await page.getByLabel("Email").fill("test@example.com");
  33 |   await page.getByLabel("Password").fill("hunter2");
  34 |   await page.getByRole("button", { name: "Sign in" }).click();
  35 |   await expect(page).toHaveURL(/\/dashboard/);
  36 | 
  37 |   const res = await page.request.get("/api/v1/auth/me");
  38 |   expect(res.status()).toBe(200);
  39 |   expect((await res.json()).email).toBe("test@example.com");
  40 | });
  41 | 
  42 | test("an unknown route renders the not-found boundary, not a blank page", async ({ page }) => {
  43 |   await page.goto("/no-such-page");
  44 |   await expect(page.getByText("Page not found")).toBeVisible();
  45 | });
  46 | 
```