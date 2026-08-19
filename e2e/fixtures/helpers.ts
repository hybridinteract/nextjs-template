import { expect, type Page, type Locator } from "@playwright/test";

/**
 * Shared steps for the end-to-end suite.
 *
 * `visible()` is the one worth understanding. `DataTable` renders **both**
 * layouts into the DOM and lets CSS pick — a stack of cards below `md`, a table
 * above it. The cards come first, so a bare `getByText(...).first()` resolves to
 * a node that is hidden on desktop and then times out waiting for it to become
 * clickable. Every text query in this suite goes through `visible()` for that
 * reason.
 */

/** The same query, narrowed to whichever copy the current viewport actually shows. */
export function visible(page: Page, locator: Locator): Locator {
  return locator.and(page.locator(":visible"));
}

export function visibleText(page: Page, text: string, exact = true): Locator {
  return visible(page, page.getByText(text, { exact }));
}

export async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("test@example.com");
  await page.getByLabel("Password").fill("hunter2");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

export async function goToList(page: Page, query = "") {
  await page.goto(`/dashboard/e2e-fixtures${query}`);
}

/** How many portal roots are attached — 0 once a modal has finished closing. */
export function portalCount(page: Page): Promise<number> {
  return page.locator("body > div.fixed.inset-0").count();
}
