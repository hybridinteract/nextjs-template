/**
 * Runs the app against a fake backend, for while the real one does not exist.
 *
 * Run: `npm run dev:mock`, then sign in with any email and password.
 *
 * It starts the mock API the e2e suite also uses (`scripts/mock-api.mjs`) and points
 * `next dev` at it. The app still runs its real login flow: cookies, proxy and
 * `/me` all work as they will in production. The mock just says yes to every
 * login and returns a superuser, so every nav item shows.
 *
 * This is a bypass by configuration, not by code. Nothing in `src/` knows about
 * it, so there is no flag that could reach production. Plain `npm run dev` talks
 * to the real backend in `.env`.
 *
 * Any other `/api/v1/*` call gets a 404 from the mock. That is expected until
 * the backend exists.
 */

import { spawn } from "node:child_process";

const MOCK_API_PORT = "8787";

const mock = spawn(process.execPath, ["scripts/mock-api.mjs"], {
  stdio: "inherit",
  env: { ...process.env, MOCK_API_PORT },
});

// An env var already set wins over `.env`, so this overrides NEXT_PUBLIC_API_URL
// for this run only. Playwright's webServer does the same.
const next = spawn("npx", ["next", "dev", "--turbopack"], {
  stdio: "inherit",
  env: { ...process.env, NEXT_PUBLIC_API_URL: `http://localhost:${MOCK_API_PORT}` },
});

// Set once shutdown starts, so the child we kill on purpose is not reported
// as a crash.
let stopping = false;

function stopAll(signal = "SIGTERM") {
  stopping = true;
  next.kill(signal);
  mock.kill(signal);
}

// If the mock dies on its own (usually: port 8787 already taken), stop the app
// too. Otherwise every login fails with a network error that looks like a bug.
mock.on("exit", (code) => {
  if (stopping) return;
  console.error(`mock api stopped (exit ${code}), stopping next dev`);
  process.exitCode = 1;
  stopAll();
});

next.on("exit", (code) => {
  if (!stopping) process.exitCode = code ?? 0;
  stopAll();
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => stopAll(signal));
}
