# The API Layer

> Read this before you make an HTTP call, or change how one is authenticated.
> Last verified against the code: 30 Sep 2026.

Guardrail: [`../../CLAUDE.md`](../../CLAUDE.md) §3.

---

## 1. What & why

There is **one** HTTP client: `apiClient` from `@/lib/api-client`. It is stateless and
same-origin. The browser never holds a token — the Next proxy injects it from an httpOnly
cookie, so a script that gets injected into the page has nothing to steal.

This is the BFF pattern, and it only works if every call goes through it. A single `fetch`
to the backend origin bypasses the proxy, carries no credentials, and 401s.

## 2. The rules

- One client: `import { apiClient } from "@/lib/api-client"`. No axios, no second wrapper.
- **Browser requests must be same-origin.** `buildUrl` uses `window.location.origin` in the
  browser; `NEXT_PUBLIC_API_URL` is for server-side BFF route handlers only.
- Never add an `Authorization` header by hand. `proxy.ts` does it.
- Errors surface as `AppError` (`@/types`) with `.statusCode` and `.message`. FastAPI 422s
  arrive pre-flattened into a readable string.
- Array query params are **repeated** (`?ids=a&ids=b`), never comma-joined.
- File downloads go through `@/lib/utilities` — never build an `<a download>` by hand.
  See [`14-files-and-downloads.md`](14-files-and-downloads.md).

## 3. How it works here

The full path of one authenticated request:

```
component → lib/<domain>/hooks.ts → lib/<domain>/api.ts → apiClient
   → fetch("/api/v1/...") on the app's own origin
   → src/proxy.ts   reads access_token cookie, sets Authorization,
                    strips spoofable hop headers, rewrites to the backend
   → backend
```

| File | Responsibility |
|---|---|
| `src/lib/api-client.ts` | The singleton. `get/post/put/patch/delete/upload/downloadBlob/postBlob`, plus `ifMatch`/`isConflict`. |
| `src/proxy.ts` | Route protection, token injection, the rewrite to the backend. |
| `src/app/api/auth/*` | BFF handlers that own the cookies. These *do* talk to the backend directly, server-side, at `/api/v1/auth/password/login`, `/refresh`, `/logout` and `/me`. |
| `src/types/index.ts` | `AppError`. |

**The BFF handlers follow the backend template's auth routes exactly**, and so does the mock
in `scripts/mock-api.mjs`, which the browser tests and `dev:mock` use. Login is JSON
`{ email, password }` to `/auth/password/login`. Logout sends `{ refresh_token }`, so the
backend revokes the session. The mock refuses the wrong path or body the way FastAPI does. A
mock that accepts anything hid a broken sign-in from 8 Jun to 30 Sep 2026: the backend moved
login from an OAuth2 form at `/auth/login`, the template kept posting there, and every test
passed. When the backend changes an auth route, change the handler and the mock together.

**`withAuthRetry`** is the single 401 → refresh → retry path, shared by every verb including
the blob helpers. Concurrent refreshes are deduplicated, so a screen firing six queries
sends one refresh, not six. If the refresh itself fails, it raises the session-expiry flag
rather than navigating — see [`15-errors-and-boundaries.md`](15-errors-and-boundaries.md).

**`ifMatch(version)` / `isConflict(err)`** support optimistic concurrency where the backend
enforces it: echo back the `updatedAt` the read returned, and a 409 means someone else saved
first. Never synthesise a version from `Date.now()` — that defeats the check it exists to
make.

## 4. Deliberately not done

| Not done | Why |
|---|---|
| **No token in JavaScript** | An httpOnly cookie cannot be read by injected script. Putting the token in memory or localStorage to "simplify" the client hands it to the first XSS. |
| **No retry on 401/403/404** | Configured in `QueryProvider`. Retrying an authorisation failure just makes the user wait three times as long for the same answer. |
| **No per-call `baseURL`** | One origin, always. A per-call override is how a request escapes the proxy. |
| **No generated client from OpenAPI (yet)** | Worth doing — it turns a backend field rename into a compile error. Not done because it needs a build step and a live schema; the hand-written `Backend*` types are the interim. |

## 5. New module checklist

1. `api.ts` — one exported function per endpoint.
2. Every response goes through a transformer before it leaves the file.
3. List params go in `options.params`; arrays stay arrays.
4. Nothing in `api.ts` imports React or throws a toast.

## 6. How to re-check this doc

```bash
# A second http client. Expect zero (match imports, not the comments warning
# against one).
grep -rnE "^import .*(axios|\bky\b)" src/; grep -nE '"(axios|ky)":' package.json
```

```bash
# Raw fetch outside the client, the BFF handlers and the proxy. Expect zero.
grep -rn "fetch(" src/ --include="*.ts" --include="*.tsx" \
  | grep -v "src/lib/api-client.ts\|src/app/api/\|src/lib/auth/api.ts"
```

```bash
# Hand-built Authorization headers. Expect exactly three files, all legitimate:
#   proxy.ts                    — injects it for the browser
#   app/api/auth/{me,logout}/   — BFF handlers, server-side, talking to the
#                                 backend directly. They are the only code that
#                                 reads the cookie, which is the whole point.
# Anything else is a bug. (api-client.ts matches on its comments; hence -l plus
# the filter.)
grep -rln "Authorization" src/ --include="*.ts" | grep -v "api-client.ts"
```
