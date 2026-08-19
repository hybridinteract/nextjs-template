/**
 * A stand-in backend for the end-to-end suite.
 *
 * The e2e tests must run with **no real backend** — otherwise the suite only
 * works on a machine that happens to have one, which means it stops being run.
 * This serves the handful of endpoints the app touches during the tests.
 *
 * It is not a mock framework and should not grow into one. If a test needs a
 * response this cannot express, that test probably belongs in the Vitest layer.
 */
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_API_PORT ?? 8787);

const USER = {
  id: "u1",
  email: "test@example.com",
  full_name: "Test User",
  is_active: true,
  is_superuser: true,
  role: "admin",
  permissions: ["users:read", "settings:read"],
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  if (path === "/api/v1/auth/login") {
    // The BFF handler posts form-encoded credentials and expects tokens back.
    return json(res, 200, { access_token: "e2e-access", refresh_token: "e2e-refresh" });
  }
  if (path === "/api/v1/auth/refresh") {
    return json(res, 200, { access_token: "e2e-access-2", refresh_token: "e2e-refresh-2" });
  }
  if (path === "/api/v1/auth/me") {
    return json(res, 200, USER);
  }
  if (path === "/api/v1/auth/logout") {
    return json(res, 200, { ok: true });
  }

  return json(res, 404, { detail: `No mock for ${path}` });
}).listen(PORT, () => {
  console.log(`mock api listening on http://localhost:${PORT}`);
});
