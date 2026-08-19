import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests — the second of two layers.
 *
 * These exist for the assertions jsdom cannot make: a real layout, a real
 * animation, a real navigation. The bugs this codebase has actually shipped were
 * all of that shape — a modal that slid out of view and then never unmounted, an
 * empty state that flashed while a query retried, a table that scrolled sideways
 * on a phone. None of them are visible to a DOM-only renderer.
 *
 * `webServer` starts both the app and a mock backend, so `npm run test:e2e`
 * works on a laptop with nothing else running. A suite that needs a live API is
 * a suite nobody runs.
 */
const PORT = 3210;
const MOCK_API_PORT = 8787;

export default defineConfig({
  testDir: "./e2e",
  testIgnore: ["**/fixtures/**"],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "line" : "list",

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },

  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    // Not a nicety: the DataTable switches to a card layout below `md`, and the
    // Modal becomes a bottom sheet. Both are CSS, so only a real viewport tests them.
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],

  webServer: [
    {
      command: `node e2e/fixtures/mock-api.mjs`,
      port: MOCK_API_PORT,
      reuseExistingServer: !process.env.CI,
      env: { MOCK_API_PORT: String(MOCK_API_PORT) },
    },
    {
      command: `npm run build && npx next start -p ${PORT}`,
      port: PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        NEXT_PUBLIC_API_URL: `http://localhost:${MOCK_API_PORT}`,
        // Unlocks the fixture route the shared-system tests drive. It 404s
        // without this, so the route cannot reach production.
        NEXT_PUBLIC_E2E: "1",
      },
    },
  ],
});
