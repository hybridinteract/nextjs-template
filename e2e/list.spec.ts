import { test, expect } from "@playwright/test";
import { signIn, goToList, visibleText } from "./fixtures/helpers";

// DataView's contract: the URL is the state, the server does the work, and the
// four display states are distinguishable. The last one matters most — an empty
// table and a failed request look identical if nobody separates them.

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

test("search is debounced into the URL, and the server filters", async ({ page }) => {
  await goToList(page);
  await page.getByPlaceholder("Search widgets…").fill("Widget 4");

  await expect(page).toHaveURL(/widgets\.q=Widget\+4/);
  await expect(visibleText(page, "8 widgets")).toBeVisible();
});

test("a filtered list survives a reload — the URL is the state", async ({ page }) => {
  await goToList(page, "?widgets.q=Widget+4");
  await expect(visibleText(page, "8 widgets")).toBeVisible();
});

test("sorting writes to the URL and reorders server-side", async ({ page }) => {
  // Driven from the toolbar's Sort menu rather than a column header, because
  // the header row does not exist on mobile — the table is a stack of cards
  // there. The toolbar is the one control both layouts share.
  await goToList(page);
  await page.getByRole("button", { name: /Name|Sort/ }).first().click();
  await page.getByRole("menuitem", { name: "Price" }).click();
  await expect(page).toHaveURL(/widgets\.sort=price/);
});

test("a failed list shows an error with a way out, never an empty table", async ({ page }) => {
  await goToList(page, "?mode=fail");
  // Scoped: Next mounts its own role="alert" route announcer on every page, so a
  // bare getByRole("alert") matches two things.
  const errorCard = page.getByRole("alert").filter({ hasText: "could not be loaded" });
  await expect(errorCard).toBeVisible();
  await expect(visibleText(page, "This list could not be loaded.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  // The distinction the error slot exists to make.
  await expect(visibleText(page, "No widgets yet")).toHaveCount(0);
});

test("a genuinely empty list invites you to create something", async ({ page }) => {
  await goToList(page, "?mode=empty");
  await expect(visibleText(page, "No widgets yet")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add your first widget" })).toBeVisible();
});

test("empty under a search says 'no results', not 'create one'", async ({ page }) => {
  // Different fix, so a different message: clear the filter, don't add a record.
  await goToList(page, "?widgets.q=zzzznomatch");
  await expect(visibleText(page, "No results found.")).toBeVisible();
  await expect(visibleText(page, "No widgets yet")).toHaveCount(0);
});

test("numbers and dates render through the shared layers", async ({ page }) => {
  await goToList(page);
  // Quantities are stored at 3dp — a raw wire string would read "1990.000".
  await expect(visibleText(page, "1,990").first()).toBeVisible();
  await expect(visibleText(page, "₹1,234.50").first()).toBeVisible();
  // A business date must not shift with the viewer's timezone.
  await expect(visibleText(page, "01 Jul 2026").first()).toBeVisible();
});

// ── Filters ──────────────────────────────────────────────────────────────────
// The fixture has five filters, so its Filters button opens the panel. The
// counts are the fixture's own rows, filtered the way a backend would.

test("the filter panel drafts, and one Apply writes every filter", async ({ page }) => {
  await goToList(page);
  await page.getByRole("button", { name: "Filters" }).click();
  const panel = page.getByRole("dialog", { name: "Filters" });

  await panel.getByRole("group", { name: "Status" }).getByRole("button", { name: "Active" }).click();
  await panel.getByRole("group", { name: "Status" }).getByRole("button", { name: "Draft" }).click();
  await panel.getByRole("group", { name: "In stock" }).getByRole("button", { name: "Yes" }).click();
  await panel.getByLabel("Price minimum").fill("1500");

  // Nothing reaches the URL, or the list, until Apply.
  await expect(page).not.toHaveURL(/f_status/);
  await panel.getByRole("button", { name: "Apply 3 filters" }).click();

  // Two statuses in one key, which apiParams sends as a repeated param. If it
  // sent "active,draft" as one value, nothing would match.
  await expect(page).toHaveURL(/widgets\.f_status=active%2Cdraft/);
  await expect(page).toHaveURL(/widgets\.f_price=1500%7C/);
  await expect(visibleText(page, "11 widgets")).toBeVisible();
});

test("a pill removes its own filter and leaves the rest", async ({ page }) => {
  await goToList(page, "?widgets.f_status=active%2Cdraft&widgets.f_in_stock=true");
  await expect(visibleText(page, "24 widgets")).toBeVisible();

  await page.getByRole("button", { name: "Remove Status filter" }).click();
  await expect(page).not.toHaveURL(/f_status/);
  await expect(page).toHaveURL(/widgets\.f_in_stock=true/);
  await expect(visibleText(page, "35 widgets")).toBeVisible();
});

test("a crossed range says why nothing can match", async ({ page }) => {
  await goToList(page);
  await page.getByRole("button", { name: "Filters" }).click();
  const panel = page.getByRole("dialog", { name: "Filters" });
  await panel.getByLabel("Price minimum").fill("2000");
  await panel.getByLabel("Price maximum").fill("1000");
  await expect(panel.getByText("The minimum is above the maximum")).toBeVisible();
});

test("with a few filters, the dropdown applies each change at once", async ({ page }) => {
  await goToList(page, "?mode=few");
  await page.getByRole("button", { name: "Filters" }).click();
  await page.getByRole("group", { name: "Status" }).getByRole("button", { name: "Archived" }).click();

  await expect(page).toHaveURL(/widgets\.f_status=archived/);
  await expect(visibleText(page, "15 widgets")).toBeVisible();
});
