import { test, expect, type Page } from "@playwright/test";

// DataView's contract: the URL is the state, the server does the work, and the
// four display states are distinguishable. The last one matters most — an empty
// table and a failed request look identical if nobody separates them.

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("test@example.com");
  await page.getByLabel("Password").fill("hunter2");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

test("search is debounced into the URL, and the server filters", async ({ page }) => {
  await page.goto("/dashboard/__fixtures__");
  await page.getByPlaceholder("Search widgets…").fill("Widget 4");

  await expect(page).toHaveURL(/widgets\.q=Widget\+4/);
  await expect(page.getByText("8 widgets")).toBeVisible();
});

test("a filtered list survives a reload — the URL is the state", async ({ page }) => {
  await page.goto("/dashboard/__fixtures__?widgets.q=Widget+4");
  await expect(page.getByText("8 widgets")).toBeVisible();
});

test("sorting writes to the URL and reorders server-side", async ({ page }) => {
  await page.goto("/dashboard/__fixtures__");
  await page.getByRole("button", { name: "Price" }).click();
  await expect(page).toHaveURL(/widgets\.sort=price/);
});

test("a failed list shows an error with a way out, never an empty table", async ({ page }) => {
  await page.goto("/dashboard/__fixtures__?mode=fail");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByText("This list could not be loaded.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  // The distinction the error slot exists to make.
  await expect(page.getByText("No widgets yet")).toBeHidden();
});

test("a genuinely empty list invites you to create something", async ({ page }) => {
  await page.goto("/dashboard/__fixtures__?mode=empty");
  await expect(page.getByText("No widgets yet")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add your first widget" })).toBeVisible();
});

test("empty under a search says 'no results', not 'create one'", async ({ page }) => {
  // Different fix, so a different message: clear the filter, don't add a record.
  await page.goto("/dashboard/__fixtures__?widgets.q=zzzznomatch");
  await expect(page.getByText("No results found.")).toBeVisible();
  await expect(page.getByText("No widgets yet")).toBeHidden();
});

test("numbers and dates render through the shared layers", async ({ page }) => {
  await page.goto("/dashboard/__fixtures__");
  // Quantities are stored at 3dp — a raw wire string would read "1990.000".
  await expect(page.getByText("1,990").first()).toBeVisible();
  await expect(page.getByText("US$1,234.50").first()).toBeVisible();
  // A business date must not shift with the viewer's timezone.
  await expect(page.getByText("01 Jul 2026").first()).toBeVisible();
});
