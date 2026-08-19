import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Unit and component tests.
 *
 * Two layers of testing, and this is the fast one. The other is Playwright
 * (`npm run test:e2e`) — see `docs/rules/16-testing.md` for what belongs where.
 * The short version: if the assertion depends on a real layout, a real animation
 * or a real network round trip, jsdom cannot see it and it belongs in Playwright.
 *
 * `vite-tsconfig-paths` reads the `@/*` alias from tsconfig, so there is no
 * second copy of the path map to keep in step.
 */
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // e2e/ is Playwright's. Running its specs here would fail confusingly:
    // both define `test`, and Playwright's needs a browser.
    exclude: ["node_modules", ".next", "e2e"],
  },
});
