# Phoenix Backport — plan to update the Next.js template

Phoenix started as this template and then had a year of real use. This is the plan to fold
what it learned back in.

Written 19 Aug 2026 after a full read of `phoenix-frontend/src/`, `phoenix-frontend/CLAUDE.md`
and the cross-cutting docs at `phoenix-backend/docs/concerns/`.

**Scope decisions already taken:**
- Multi-branch tenancy — **not** ported. The template stays single-tenant.
- Form pattern — **React Hook Form + zod** for everything the generator emits.
- The analytics kit — **skipped entirely**.
- Phoenix's own known gaps — **fixed here** rather than mirrored.

---

## Phase 0 — Make the template work  ✅ done 19 Aug 2026

The template's authenticated API calls do not work as shipped. Two files cause it.

| Change | File | What to do |
|---|---|---|
| Browser calls go same-origin | `src/lib/api-client.ts` | `buildUrl` uses `window.location.origin` in the browser; `NEXT_PUBLIC_API_URL` only server-side. Today every call goes cross-origin to port 8000, so the httpOnly cookie set on port 3000 never travels. |
| The proxy forwards, not passes through | `src/proxy.ts` | Replace `NextResponse.next()` with `NextResponse.rewrite(new URL(pathname + search, BACKEND_URL))`. Next has no `/api/v1/*` route, so today it 404s. |
| Strip spoofable headers | `src/proxy.ts` | Delete `x-real-ip`, `x-forwarded-for`, `x-forwarded-host`, `x-forwarded-proto`, `x-forwarded-port`, `forwarded` before forwarding. A browser can set these and the backend uses them for rate limits and the audit trail. |
| Repeated array params | `src/lib/api-client.ts` | `?ids=a&ids=b`, not comma-joined. FastAPI 422s on the comma form. |
| Strict permission keys | `src/lib/permissions/types.ts` | Drop `\| string` from `Permission`. Today a typo like `users.read` compiles and returns false for everyone but a superuser — a silently missing button. |
| `lint` script | `package.json` | `next lint` was removed in Next 16. Use `eslint .`, add `lint:fix`. |
| tsconfig | `tsconfig.json` | `jsx: "react-jsx"`, add `.next/dev/types/**/*.ts` to `include`. |
| Mutation typing | `src/lib/loading/mutation.ts` | `onMutate: (variables, context)` — the TanStack v5 signature Phoenix is on. |

**Check:** log in, hit an authenticated endpoint, confirm the request goes to `localhost:3000`
and comes back 200.

---

## Phase 1 — The shared systems  ✅ done 19 Aug 2026

### 1.1 DataView — the list system

New `src/components/data-view/` (8 files, ~1,100 lines). One hook plus one component replace
hand-rolled page/search/filter/sort state on every list page. State lives in the URL, so a
filtered list is shareable and survives back/forward. `apiParams` matches the FastAPI list
contract (`skip` / `limit` / `search` / `sort_by` / `sort_order` + filters) and feeds straight
into a query hook.

Port: `types.ts`, `use-data-view.ts`, `data-view.tsx`, `data-toolbar.tsx`,
`data-pagination.tsx`, `use-row-selection.ts`, `bulk-action-bar.tsx`, `index.ts`.

Rewrite `src/components/shared/data-table/index.tsx`. The template's 94-line version has no
sortable headers, no selection checkboxes, and no mobile card layout — so wide tables scroll
sideways on a phone. Phoenix's is 307 lines.

**Two additions Phoenix does not have** (their open items A2 and B6):
- an `error` + `onRetry` slot. A failed list query currently renders as an empty table,
  indistinguishable from "no data".
- an `emptyState` slot — a per-module message plus the permission-gated create button.

Needs shadcn `popover`, `command`, `checkbox`, `dropdown-menu`, `select`, `alert-dialog` —
all already in ncube's install list. Also needs `SearchableSelect` from 1.6.

### 1.2 Modal and the unsaved-work guard

`src/components/ui/modal.tsx` — side panel on desktop, bottom sheet on phone. Tabs, a
view↔edit pencil, sticky footer, header actions, focus restore on close.

The part that matters is `isDirty`. When the form inside holds unsaved typing, Escape, a
backdrop click and the X ask before closing, and the browser warns on tab close. Without it
one stray Escape wipes a half-filled form.

Its two companions:
- `src/lib/forms/dirty.ts` — `isFormDirty(current, initial)`. Compares against the state the
  form opened with, never against empty. Compare against empty and every edit form is dirty
  before you touch it, and people learn to click through the prompt.
- `src/lib/forms/reset-on-open.ts` — `useResetOnOpen`. Modals stay mounted while closed, so a
  discarded form is still sitting there the next time it opens. This clears it.

Plus `Field` and `DetailRow`. Phoenix keeps these in `components/settings/shared.tsx`, which
is the wrong home — put them in `src/components/shared/form-fields.tsx`.

### 1.3 Page furniture

- `src/components/ui/page-header.tsx` + `src/components/layout/page-layout.tsx`
- `src/components/ui/status-badge.tsx` — six tones: neutral / success / warning / danger / info / brand
- `src/app/globals.css` — **add `--success`, `--warning`, `--info`** in both themes and map
  them in `@theme inline`. The template has none, so `text-success` and `text-warning` do not
  exist. That is why people reach for `text-green-600` and break dark mode.

### 1.4 Dates and times

Replace `src/lib/date-utils.ts` wholesale (78 → 167 lines). Add `src/lib/timezone.ts`. Copy
`date-and-time.md`.

Two bugs it exists to stop:
- `toLocaleDateString()` follows the viewer's browser locale **and** timezone, so the same
  record reads differently on different machines. `07/08/2026` is 7 August to a Brit and
  8 July to an American.
- `new Date("2026-07-15")` on a date-only value parses as UTC midnight, so it shows 14 July
  anywhere west of UTC.

Output is fixed at `14 Jul 2026`, assembled from `Intl` parts so it cannot drift with the
runtime's locale.

Phoenix's `useDisplayTimeZone()` resolves user preference → device → branch → default.
Without branches that becomes user preference → device → default.

### 1.5 Money and quantities

New `src/lib/numeric/` — `decimal.ts`, `money.ts`, `quantity.ts`, `index.ts`. Adds `big.js`
and `@types/big.js`.

Money and quantities arrive as strings and stay strings. All arithmetic goes through big.js,
never JS floats.

Delete `formatCurrency` and `formatNumber` from `src/lib/utils.ts` — both build
`Intl.NumberFormat` with a locale argument, the same trap as the date one. A German browser
renders `1234.5` as `1.234,5` and the same invoice reads as a different amount.

Skip `measurement.ts` — calibration-specific.

### 1.6 Reference pickers — the permission fix

New `src/lib/reference/` (types, transformers, api, hooks, index) plus
`src/components/shared/searchable-select.tsx` and `reference-picker.tsx`.

The bug this fixes: a dropdown fed by the owning module's list endpoint needs that module's
read permission. "May this person browse the vendor register?" and "may this person put a
vendor on the purchase request they are allowed to raise?" are different questions. Answering
both with `vendors:read` gives a form with a permanently empty required field. Phoenix's audit
found this in **14 places across 6 of their 10 non-admin roles**.

The fix is a second, deliberately tiny endpoint per resource — `GET /<resource>/options`, no
permission, returning `id` + `label` + one disambiguator. Its safety comes from being that
narrow, not from a gate.

**This only works if the backend has the matching convention.** Worth doing in the FastAPI
template at the same time. The frontend ships with an empty `REFERENCE_RESOURCES` map and a
worked example in the comment.

Reference: `phoenix-backend/docs/concerns/reference-data-and-pickers.md`.

### 1.7 Files and the API client

- `src/lib/utilities/download.ts` — `downloadApiFile`, `downloadBlob`, `downloadExternalUrl`,
  `safeFilename`. One place for the hidden-`<a>` dance, revoke timing and Safari quirks.
- `src/lib/utilities/logger.ts` — thin wrapper so Sentry or Datadog drops in later without
  touching call sites.
- `api-client.ts` gains `downloadBlob()`, `postBlob()`, and `ifMatch(version)` /
  `isConflict(err)` for optimistic-concurrency writes (If-Match → 428 / 409).
- **Extract `withAuthRetry(fetchFn)`.** Phoenix duplicates the 401→refresh→retry dance three
  times and lists it as an open item (A7). Do it once here.

### 1.8 The dashboard shell — lower priority

Phoenix split `dashboard-shell.tsx` into 9 files and gained a mobile dock nav, a collapsible
sidebar with persisted state, and a sidebar↔top-bar layout toggle. Worth having, but it is
tangled with Phoenix's logo, theme toggle and SVG icon components, so it needs a de-branding
pass. The template's current shell works. Do this last.

Also port: `NavItem.group` (sidebar section headings) and `subItems`, from
`phoenix-frontend/src/types/index.ts`.

### What changed against this plan

Three things came out differently once the code was in front of me:

- **shadcn/ui is now committed.** A fresh clone could not type-check or build, so CI was red.
  `ncube setup` stays as a refresh command.
- **DataView needed a fourth state.** `isLoading` is false from the first render when a hook uses
  `placeholderData`, so a slow or retrying list flashed the empty state. It takes `isPending` now.
- **Two bugs came across with the port and were fixed here**, both still live in Phoenix: the
  Modal never unmounted (framer-motion's `onAnimationComplete` does not fire), and 28 lint
  problems Phoenix carries as a baseline. The template is lint-clean.

---

## Phase 2 — Hardening the defaults  ✅ done 19 Aug 2026

| Change | Files | Why |
|---|---|---|
| Error boundaries | `src/app/error.tsx`, `global-error.tsx`, `not-found.tsx`, `(dashboard)/dashboard/error.tsx` | The template has none. An unhandled render error white-screens the app. The dashboard one keeps the shell alive when a page crashes. |
| Session-expired dialog | `src/lib/api-client.ts` + a small provider | Today a failed refresh does `window.location.href = "/login"` and eats any half-filled form. Show a dialog instead and carry `?redirect=` back — `proxy.ts` already reads it. |
| Security headers | `next.config.ts` | CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP, HSTS in production. Nothing else sets these on the pages a user loads. |
| ESLint rules | `eslint.config.mjs` (new) | `error`-level bans on `toLocale*String()`, `new Date().toISOString().slice(0,10)` and raw `Intl.NumberFormat`. Only ESLint catches these — `tsc` will not. Plus `_`-prefix for deliberately unused bindings. **One `no-restricted-syntax` block only** — in flat config a second block replaces the first rather than merging, which silently switched Phoenix's date rules off once. |
| A test runner | `package.json`, `tsconfig.json` | `node --test "src/**/*.test.ts"` — Node's built-in runner with native TS stripping. No dependency, no build step. Ship one example test on a transformer. |
| Keep the devtools | — | The template has `ReactQueryDevtools` and Phoenix lost it. Keep it. |
| CI | `.github/workflows/ci.yml` | Add `npm run build` and `npm test` to the existing type-check + lint job. |

---

## Phase 3 — Docs and the generator  ✅ done 19 Aug 2026

### 3.1 One convention doc

Delete `FRONTEND_ARCHITECTURE_GUIDE_V2.md` (77KB) and `FRONTEND_LLM_PROMPT.md` (19KB).
Phoenix deleted both as "generic scaffolding templates for a codebase we don't have".

*Outcome: the guide was rewritten as `docs/FRONTEND_ARCHITECTURE_GUIDE_V3.md` (a narrative
that links to `docs/rules/`), and the LLM prompt was deleted outright — `CLAUDE.md` is what
an AI tool reads, and a second copy of the same rules only drifts.*

Write `CLAUDE.md` in their place, modelled on Phoenix's: module anatomy, the wire-format
boundary, the API layer, TanStack Query rules, toasts and errors, permissions, list pages,
components and routing, forms, styling, TypeScript, dates and numbers — then the numbered
anti-patterns list and a new-feature checklist.

The anti-patterns list earns its keep: each line names a violation and points at the section
that fixes it. It is what an LLM actually checks itself against.

### 3.2 README

Trim what CLAUDE.md now owns. Fix the stack table — it says Next.js 15.x and the package is
on 16.1.6.

### 3.3 `ncube.js startdomain` — regenerate what it emits

| Generated file | Change |
|---|---|
| `types.ts` | Enums from `as const` arrays, `PAGE_SIZE`, zod schemas |
| `transformers.ts` | Carries its own ~8-line `asEnum(raw, ALLOWED, fallback)`. Never cast a raw backend string to an enum type. |
| `api.ts` | Unchanged shape — thin functions over `apiClient`, a transformer on every response |
| `hooks.ts` | Already close. Add a `staleTime` tier comment. |
| **`store.ts`** | **Delete it from the generator.** A per-domain Zustand store for list state is the exact anti-pattern DataView replaces. |
| `<x>-view.tsx` | New — DataView list with filters, sort options, permission-gated create |
| `<x>-form.tsx` | Rewrite on React Hook Form + zod |
| `<x>-detail-modal.tsx` | New — shared `<Modal>` with view↔edit and `isDirty` |
| `page.tsx` | Server component: `export const metadata`, `<PageLayout>`, mount the client view. No hooks, no fetching. |
| `loading.tsx` | New |

### 3.4 Version bump

`node ncube.js bump minor` + a RELEASE_NOTES.md entry.

---

## Phase 4 — Beyond the original plan  ✅ done 19 Aug 2026

Three things added after the phases above, at Avinash's direction:

- **`node ncube.js remove <feature>`** — the template ships more than most projects need, and
  dead code is worse than absent code. Seven subsystems strip cleanly; `docs/OPTIONAL_PARTS.md`
  is generated from the same manifest so the docs cannot drift from the command.
- **Installable PWA, no service worker.** Manifest and icons are free and risk-free. A service
  worker is a caching proxy in front of an auth-gated app — the wrong config writes
  authenticated data to disk that survives logout. Documented as opt-in in
  `docs/rules/17-pwa-and-offline.md`.
- **Two test layers.** Vitest for pure modules and component logic, Playwright for the shared
  systems in a real browser. The split is not preference: both real bugs found during this
  work were animation- and layout-shaped, which jsdom cannot see.

---

## Not porting

| Left in Phoenix | Why |
|---|---|
| Multi-branch tenancy | Decision taken. `X-Active-Branch`, the branch store and switcher, and the `removeQueries`-on-switch rule stay there. |
| The analytics kit (13 files) | Decision taken. Needs a matching `/stats` endpoint per module, which a fresh project will not have. |
| Brand and atmosphere | The red/orange theme, Oxygen fonts, the WebGL phoenix animation (`ogl`), the auth curtain and brand panel. |
| Domain modules | certificates, HRM, procurement, CRM, clients, instruments, inventory, repairs, work orders, activity log, settings, lookups. |
| The permission catalog | Phoenix's ~200 keys are theirs. Keep the template's small generic set, with the strict type from Phase 0. |
| In-app help pages | The `guide-button` / `status-guide` iframe system and the CSP exemption it needs. |

---

## Order, checks, sizing

Phase 0 stands alone — do it first and the template works.

Inside Phase 1 there is one dependency chain: `SearchableSelect` (1.6) → DataView (1.1) →
the generator (3.3). Everything else is independent.

Phases 2 and 3 can run in any order once Phase 1 lands.

After each phase, all three must be clean:

```
npm run type-check
npm run build
npm run lint
```

The template starts lint-clean and should stay that way. Phoenix carries a lint baseline it
cannot fix; do not inherit that.

**Rough sizing:** Phase 0 half a day. Phase 1 is the bulk — about a week if you port carefully
rather than copy. Phase 2 two days. Phase 3 two to three days, most of it CLAUDE.md and the
generator.

---

## Source references

- `phoenix-frontend/CLAUDE.md` — the single convention doc, and the model for the template's
- `phoenix-frontend/date-and-time.md`
- `phoenix-backend/docs/09-frontend-improvements.md` — their open backlog (items A1–A10, B1–B12)
- `phoenix-backend/docs/concerns/caching.md` — staleTime tiers, query-key rules
- `phoenix-backend/docs/concerns/reference-data-and-pickers.md` — the picker permission fix
- `phoenix-backend/docs/concerns/pagination-and-search.md` — the list contract DataView matches
- `phoenix-backend/docs/concerns/unsaved-work.md` — the modal dirty guard
- `phoenix-backend/docs/concerns/error-handling.md`
