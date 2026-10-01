/**
 * A stand-in backend for the end-to-end suite.
 *
 * The e2e tests must run with **no real backend** — otherwise the suite only
 * works on a machine that happens to have one, which means it stops being run.
 * This serves the handful of endpoints the app touches during the tests.
 *
 * `npm run dev:mock` also uses it, so the app can be opened before the real
 * backend exists. Change the auth paths here when the backend's differ, or both
 * the suite and dev:mock break. It lives in scripts/, not e2e/, so
 * `ncube remove e2e` leaves dev:mock working.
 *
 * **It answers the auth routes the way the backend template does**, down to the
 * path and the body shape, and refuses anything else. Until 30 Sep 2026 it took
 * the old form-encoded `/auth/login`, which the backend had dropped on 8 Jun,
 * so sign-in passed every test here and failed against the real backend.
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

// Each sign-in gets its own tokens, so one test's sign-out cannot revoke
// another's session. The suite runs in parallel.
let issued = 0;
const revoked = new Set();

function issueTokens() {
  issued += 1;
  return { access_token: `e2e-access-${issued}`, refresh_token: `e2e-refresh-${issued}` };
}

/** The JSON body, or null when there is none or it is not JSON. */
async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** FastAPI's answer to a missing or malformed body. */
function missingBody(res) {
  return json(res, 422, { detail: [{ loc: ["body"], msg: "Field required", type: "missing" }] });
}

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  if (path === "/api/v1/auth/password/login") {
    // Any email and password signs in. The shape still has to be the backend's.
    const body = await readJson(req);
    if (typeof body?.email !== "string" || typeof body?.password !== "string") return missingBody(res);
    return json(res, 200, issueTokens());
  }
  if (path === "/api/v1/auth/refresh") {
    const body = await readJson(req);
    if (typeof body?.refresh_token !== "string") return missingBody(res);
    if (revoked.has(body.refresh_token)) return json(res, 401, { detail: "Refresh token revoked" });
    // Like the backend: a refresh token works once. It is retired as the new
    // pair is issued, so two refreshes with the same token fail here too.
    revoked.add(body.refresh_token);
    return json(res, 200, issueTokens());
  }
  if (path === "/api/v1/auth/me") {
    return json(res, 200, USER);
  }
  if (path === "/api/v1/auth/logout") {
    // Like the backend: a body is required, and the token in it is revoked.
    const body = await readJson(req);
    if (body === null) return missingBody(res);
    if (body.refresh_token) revoked.add(body.refresh_token);
    return json(res, 200, { status: "success" });
  }

  return json(res, 404, { detail: `No mock for ${path}` });
}).listen(PORT, () => {
  console.log(`mock api listening on http://localhost:${PORT}`);
});
