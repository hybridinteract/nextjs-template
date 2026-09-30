# CLAUDE.md — Next.js Template

Read this before adding or changing anything. It encodes the conventions this codebase
follows. When in doubt, copy the shared systems rather than working around them.

**This file is the guardrail — the one-line version of each rule.** The full rule, with the
reasoning and what was deliberately left undone, lives in
[`docs/rules/`](docs/rules/README.md), one file per rule. Each section below names its rule
file; go there before changing behaviour, not just before reading it.

Stack: Next.js 16 (App Router, RSC) · React 19 · TypeScript (strict) · TanStack Query v5 ·
Zustand · Tailwind v4 (CSS-var tokens) · shadcn/Radix · react-hook-form + zod · sonner ·
framer-motion · lucide-react · big.js. Path alias `@/*` → `src/*`.

**Before claiming done, all four must pass:**

```bash
npm run type-check && npm run lint && npm test && npm run build
```

And before opening a PR, the browser suite: `npm run test:e2e`. CI does not run it.

`npm run lint` **is** clean. Keep it that way — this template starts with zero problems, and
a baseline of "known failures" is how a lint run stops being read. Run it especially when you
touch dates or numbers: the `no-restricted-syntax` rules in `eslint.config.mjs` are
error-level and **only ESLint catches them** (tsc will not).

**Not every section below applies to every project.** Six subsystems are optional and may
have been removed with `node ncube.js remove <feature>` — permissions, numeric, reference,
blocking-loading, data-view, dark-mode. Check whether the folder exists before assuming a
rule applies. See [`docs/OPTIONAL_PARTS.md`](docs/OPTIONAL_PARTS.md).

Narrative overview: [`docs/FRONTEND_ARCHITECTURE_GUIDE_V3.md`](docs/FRONTEND_ARCHITECTURE_GUIDE_V3.md).
Doc index: [`docs/README.md`](docs/README.md).

---

## 1. Module anatomy (the layering is non-negotiable)

→ [`docs/rules/01-module-anatomy.md`](docs/rules/01-module-anatomy.md)

Every domain splits into a **data layer** (`src/lib/<domain>/`) and a **UI layer**
(`src/components/<domain>/`), surfaced by `src/app/(dashboard)/dashboard/<domain>/page.tsx`.

| File | Responsibility |
| --- | --- |
| `types.ts` | Enums + labels, `Backend*` (wire/snake_case) shapes, frontend (camelCase) shapes, payload/param types, `PAGE_SIZE`. |
| `transformers.ts` | **The only** snake_case↔camelCase boundary. Pure functions, `transformX(raw): X`. |
| `api.ts` | Thin functions over `apiClient`; a transformer on every response. No fetch, no React. |
| `hooks.ts` | `"use client"`. Query-key factory + queries + mutations. Toasts and invalidation live here. |
| `index.ts` | Public barrel. Components import from `@/lib/<domain>`, never deep paths. |

Direction is strict: `page.tsx` → `components/<domain>` → `lib/<domain>/hooks` → `api` →
`api-client`. **Never** call `apiClient` or `fetch` from a component, and never import
another domain's `api.ts`/`transformers.ts` — go through its barrel.

**Domain groups.** Nest related modules: `src/lib/crm/leads/` + `src/components/crm/leads/`.
Each keeps the full anatomy and its own barrel; there is **no group-level barrel**. Route
folders stay flat, so URLs and permission strings do not change.

## 2. Wire format ↔ domain format

→ [`docs/rules/02-wire-format.md`](docs/rules/02-wire-format.md)

- Backend speaks **snake_case**; the frontend speaks **camelCase**. Convert at the
  transformer, nowhere else.
- Request **payloads** are the exception — snake_case (`CreateXPayload`), produced by
  `formToPayload()`.
- Money and decimals arrive as **strings and stay strings**. Use `@/lib/numeric` to compute
  or render.
- Coerce unknown enum strings with `asEnum(raw, ALLOWED, fallback)` — never cast a raw
  backend string to an enum type. `asEnum` is a **per-module local**: each `transformers.ts`
  defines its own ~8-line copy.

## 3. API layer

→ [`docs/rules/03-api-layer.md`](docs/rules/03-api-layer.md)

- One singleton: `import { apiClient } from "@/lib/api-client"`
  (`.get/.post/.put/.patch/.delete/.upload/.downloadBlob/.postBlob`).
- It is **stateless and same-origin**: the Next proxy injects auth from httpOnly cookies and
  handles 401→refresh→retry. Do not add tokens, `Authorization` headers, or a second http
  client (no axios).
- Errors surface as `AppError` (`@/types`) with `.statusCode`/`.message`. FastAPI 422s are
  pre-flattened to readable strings.
- Array params are **repeated** (`?ids=a&ids=b`), never comma-joined.
- `ifMatch(version)` / `isConflict(err)` for optimistic-concurrency writes.

## 4. Data fetching — TanStack Query

→ [`docs/rules/04-data-fetching.md`](docs/rules/04-data-fetching.md)

- Every domain owns a **query-key factory**:
  `export const xKeys = { all, lists(), list(params), detail(id) }`. Build keys only from it.
- Queries: pick a `staleTime` **tier** (10s / 30s default / 1m / 5m / Infinity). Lists use
  `placeholderData: (prev) => prev`; detail queries gate with `enabled: Boolean(id)`.
- The global QueryClient already sets `staleTime`, disables refetch-on-focus and skips retry
  on 401/403/404 — **don't re-configure per call.**
- After a write, don't trust nested collections in the response — refetch.
- **Server data never goes in a Zustand store.**

## 5. Mutations, toasts & the loading overlay

→ [`docs/rules/05-mutations-and-toasts.md`](docs/rules/05-mutations-and-toasts.md)

- Writes wrap **`useBlockingMutation`** (`@/lib/loading`) with a `label`.
- `invalidateQueries` goes **inside** the `mutationFn`, awaited before returning.
- **Success toasts live in the hook's `onSuccess`.** Components `await mutateAsync()` then
  close or reset — they do **not** toast success.
- **Toast through `notify` (`@/lib/toast`), never `toast` from `sonner`.** ESLint blocks the
  import. Errors are `notify.fromError(err, "Could not …")` in `onError`: it shows the
  backend's message, and a retry replaces its last error instead of stacking. A partial
  result is `notify.warning`.
- **Exception — multi-step forms:** one user action firing several mutations emits **one
  aggregated** toast in the component, and those hooks stay silent on success.
- `<Toaster>` is mounted in `<AppProviders>` (`components/providers/app-providers.tsx`); don't add another.

## 6. Permissions

→ [`docs/rules/06-permissions.md`](docs/rules/06-permissions.md)

- Gate every privileged affordance with `usePermission("<domain>.<action>")`
  (`@/lib/permissions`). Also `useAnyPermission` / `useAllPermissions` /
  `useFilteredNavItems`. Note the **dot** format here; a backend typically uses
  `resource:action`.
- `Permission` is a **strict union**, not `string`. A mistyped key is a compile error, on
  purpose.
- Permission gating is **UI affordance only** — the backend is the real guard. Don't assume a
  hidden button means a safe endpoint, and don't hardcode role names.
- **Never feed a dropdown from a module's list hook** — see §13. That is a real bug, not a
  style point.

## 7. List pages — always DataView

→ [`docs/rules/07-list-pages.md`](docs/rules/07-list-pages.md)

Every list page uses `@/components/data-view`; do not hand-roll search/filter/sort/pagination
state.

```tsx
const dv = useDataView({ namespace: "orders", defaultSort: { field: "created_at", order: "desc" } });
const { data, isLoading, isPending, error, refetch } = useOrders(dv.apiParams);

<DataView params={dv} columns={columns} data={data?.items ?? []} total={data?.total ?? 0}
  isLoading={isLoading} isPending={isPending} error={error} onRetry={refetch}
  keyExtractor={(r) => r.id} onRowClick={(r) => setDetailId(r.id)}
  filters={filters} sortOptions={SORT_OPTIONS} searchPlaceholder="Search orders…"
  emptyState={<EmptyOrders … />} actions={…} />
```

- State is **URL-synced** (shareable, back/forward aware); `namespace` prevents collisions
  when a page has two tables. Backend does the actual search/sort/paginate.
- **Pass `isPending`, `error` and `onRetry` — all three.** Without them a failed list renders
  as an empty table ("there is no data"), and a slow one flashes the empty state.
- Filter types: `select`, `multiselect`, `reference`, `daterange`, `numberrange`, `boolean`.
  **A multi-select, reference or range filter needs `filters` passed to `useDataView` too**,
  or `apiParams` sends the joined string. A multi-select or reference filter needs a backend
  param that takes a list. Past four filters the Filters button opens a panel that applies in
  one write. Applied filters show as removable pills.
- `useSearchParams` needs dynamic rendering — already handled by
  `app/(dashboard)/dashboard/layout.tsx` exporting `dynamic = "force-dynamic"`.

## 8. Components & routing

→ [`docs/rules/08-components-and-routing.md`](docs/rules/08-components-and-routing.md)

- `page.tsx` is a **Server Component**: `export const metadata`, render `<PageLayout>` with
  title/description/icon, mount the client view. No data fetching, no hooks.
- `<XView>` carries `"use client"` and owns interaction state. Add `"use client"` **only**
  where hooks or interactivity are needed.
- Detail/create/edit use the shared **`<Modal>`** (`@/components/ui/modal`): side panel on
  desktop / bottom sheet on mobile, with `size`, `tabs`, `mode` (view↔edit pencil),
  `headerActions`, sticky `footer`. `placement="center"` opens it in the middle of a laptop
  screen instead, for starting something new. Read-only rows use `<DetailRow>`; form fields
  use `<Field>`. Don't build bespoke dialogs.
- Reach for `@/components/shared` before writing a new control. **That barrel cannot be
  imported from a Server Component** — `lazy.tsx` calls `dynamic(…, { ssr: false })`. From a
  `page.tsx`, import by the component's own path.

**Command palette.** Ctrl+K (⌘K on a Mac), or the search button in the sidebar, opens it. It
lists `dashboardNavItems` after the permission filter, so a new page in the sidebar is in the
palette with no extra work. It is also the only place to switch between light and dark.

**Navigation config.** `app/(dashboard)/config.ts` is pure data — **zero JSX, zero hooks**. It
owns `dashboardNavItems` (each with `permission`/`permissions` and a `group` label that sets
the sidebar section) and the `ROUTES` constants. Import route strings from `ROUTES`; never
inline `/dashboard/orders`.

**Provider stack.** `app/layout.tsx` holds fonts, metadata and `ThemeProvider`, nothing else.
`(auth)` and `(dashboard)` each mount `<AppProviders>`: `QueryProvider` → `<Toaster>` →
`{children}` → `GlobalLoadingOverlay` → `SessionExpiredDialog`. **`<Toaster>` stays first**:
mounted after the page, it misses every toast raised while the page mounts. `QueryProvider`
keeps **one client per browser tab**, so the cache survives the move from sign-in to the
dashboard. Only add a provider to the root layout if the public site needs it too. Auth
state syncs in `(dashboard)/layout.tsx`, not a global AuthProvider — that keeps
unauthenticated pages from firing `/api/auth/me`.

**Public site** (`app/(site)`): pages anyone can read without signing in, starting with `/`.
It mounts **no providers**, so a visitor downloads no query client and no toaster. A public
page that needs data or toasts mounts `<AppProviders>` in its own layout. A toast raised
just before sign-in or sign-out moves you between groups is lost with the old toaster, so
say it on the page you land on. No public site? `node ncube.js remove site`.

**Blocking loading** (`@/lib/loading`): a Zustand store tracks concurrent blocking actions by
token; `useBlockingMutation` owns the token lifecycle and `GlobalLoadingOverlay` renders the
label.

**Tab state persists to the URL.** Use `useTabState`, or `useZustandTabSync` when a store
already holds `activeTab`. Don't hand-roll `?tab=`.

## 9. Forms & unsaved work

→ [`docs/rules/09-forms-and-unsaved-work.md`](docs/rules/09-forms-and-unsaved-work.md)

- New forms use **react-hook-form + zod**. `formToPayload(values)` produces the snake_case
  payload (trims, maps `""` → `undefined`).
- **A modal holding typed input must pass `<Modal isDirty>`** or one stray Escape wipes it —
  and dirtiness compares against *the state the form opened with*, never against empty.
- **It must also clear that state**, via `useResetOnOpen(isOpen, reset)` (`@/lib/forms`), a
  seeding `openCreate()`, or `<Modal onDiscard>`: these panels stay mounted while closed, so
  otherwise "Discard" throws nothing away and the values are still there on the next open.
- A wrapper that reads its record **before** rendering `<Modal>` (`if (!user) return null`,
  or picking between two modals) makes the panel vanish instead of sliding out. Hold the
  record with `useLastOpenValue(record, isOpen)` (`@/lib/forms`).
- Autosave only where the record already exists and the form is long enough to earn it.

## 10. Styling — semantic tokens only

→ [`docs/rules/10-styling.md`](docs/rules/10-styling.md)

- Use the CSS-variable tokens from `globals.css`, never raw Tailwind palette or hex:
  `bg-primary` `text-primary-foreground` `text-muted-foreground` `border-border` `bg-card`
  `text-destructive` `text-success` `text-warning` `text-info` `bg-accent`. This is what makes
  dark mode work.
  - ❌ `text-red-500`, `text-green-600`, `bg-gray-100`, `style={{ color: "#AA232B" }}`
  - ✅ `text-destructive`, `text-success`, `bg-muted`, `text-primary`
  - ESLint blocks the raw palette, hex and made-up sizes (`text-[13px]`) in class names,
    and a raw `<button>`/`<input>`/`<select>`/`<textarea>`/`<table>` outside the folders
    that build parts. **Fix the lint error, never disable it.**
- Status pills → `<StatusBadge label tone={…} />` (`neutral`/`success`/`warning`/`danger`/
  `info`/`brand`). Map domain status→tone in a small helper.
- Compose classes with `cn()` (`@/lib/utils`). Use shadcn primitives — don't restyle native
  elements. Style buttons with `<Button variant size>`, never a class string. Icons:
  `lucide-react`, sized `size-4`/`size-3.5`.
- Import order: external packages → `@/lib/*` → `@/components/*` → relative `./`.
- Anything that portals takes its z-index from the ladder in `globals.css`
  (`z-(--z-modal)` / `--z-dialog` / `--z-popper` / `--z-tooltip`), **never a bare `z-50`**.
  A `<Select>` inside a `<Modal>` used to open behind it.
- **Every shared part is on `/dashboard/design`** (`src/components/design/`). Copy from
  there. A new part goes on it in the same change. The `build-ui` skill in `.claude/skills/`
  says the same, for Claude.
- **Rebrand by editing the token values in `:root` and `.dark`.** Nothing else.

## 11. TypeScript

→ [`docs/rules/11-typescript.md`](docs/rules/11-typescript.md)

- `strict` is on. **No `any`** (use `unknown` + narrowing). Derive enums/labels from
  `as const` arrays, not loose string unions.
- Props are explicit `interface`s. Prefer `import type { … }`.
- A deliberately unused binding is marked with a leading `_`.
- A union that includes `string` **is** `string` — don't widen a literal union "to be safe".

## 12. Dates, times & numbers

→ [`docs/rules/12-dates-and-numbers.md`](docs/rules/12-dates-and-numbers.md)

- **All date/time formatting goes through `@/lib/date-utils`** — `formatDate`,
  `formatDateTime`, `formatTime`, `formatBusinessDate` (and its short and long forms),
  `formatTimeLeft`, `formatCountdown`, `todayString`, `toDateString`. Never
  `toLocaleDateString()/toLocaleString()/toLocaleTimeString()` (browser-locale **and**
  browser-timezone dependent) and never `new Date(ymd)` on a `YYYY-MM-DD` business date
  (parses as UTC midnight → off-by-one west of UTC). ESLint blocks both.
- Pass an explicit zone: **`useDisplayTimeZone()`** for instants, **`useBusinessTimeZone()`**
  for business-date inputs.
- A `<input type="datetime-local">` has no zone. Read it with
  `instantFromZonedInput(value, timeZone)` and fill it with `zonedInputValue(instant,
  timeZone)`, never `new Date(value)`, which reads it in the device's zone.
- **The defaults are India**: `DEFAULT_TIME_ZONE = "Asia/Kolkata"`, a 12-hour clock,
  `NUMBER_LOCALE = "en-IN"` (₹12,75,000) and `DEFAULT_CURRENCY = "INR"`. Change them once, in
  `date-utils.ts` and `numeric/`, for a project outside India. Never per call site.
- **All money and quantity formatting goes through `@/lib/numeric`.** Values are decimal
  **strings**; arithmetic uses `big.js` (`toBig`, `sumMoney`, `lineTotal`). Never
  `Intl.NumberFormat` at a call site. `formatMoneyShort` gives ₹8.21L and ₹1.25Cr for a
  tile with no room. Never on a bill.
- Quantities are stored at 3 dp, so the padding is storage, not information — render a raw
  wire string and you get `1990.000`. Use `formatQuantity` for **display**, and
  `toBig(x).toString()` when seeding an editable `type="number"` input.

## 13. Reference data & pickers

→ [`docs/rules/13-reference-data.md`](docs/rules/13-reference-data.md)

- **Never feed a dropdown, filter or name-column from a module's list hook.** `useVendors` /
  `useClients` need that module's read permission, which the person filling in the form often
  doesn't hold — an audit of the app these patterns came from found that in **14 places
  across 6 of 10 roles**.
- Use `useReferenceOptions(resource)` (`@/lib/reference`) or `<ReferencePicker>`
  (`@/components/shared`), which read an ungated `/<resource>/options` route returning
  id + label + one disambiguator.
- **Never add a fifth field to that shape.** No money, contact details, addresses, stock
  levels or costs.
- If a control genuinely needs gated data, fetch it separately and pass `enabled` from
  `usePermission` rather than firing it and swallowing a 403.

## 14. Files & downloads

→ [`docs/rules/14-files-and-downloads.md`](docs/rules/14-files-and-downloads.md)

- Downloads go through `@/lib/utilities` (`downloadApiFile`, `downloadBlob`,
  `downloadExternalUrl`) — one place for the hidden-`<a>` dance, revoke timing and Safari
  quirks. **Never build an `<a download>` by hand.**
- The server's filename is what the recipient receives — pass it through untouched.
  `safeFilename` is only for a name you built.

## 15. Errors, boundaries & session expiry

→ [`docs/rules/15-errors-and-boundaries.md`](docs/rules/15-errors-and-boundaries.md)

- Four boundaries, four blast radii: `app/(dashboard)/dashboard/error.tsx` (keeps the shell),
  `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx`. **Don't delete any of them.**
- Narrow with `err instanceof AppError`, never a string match on the message.
- Log through `logger` (`@/lib/utilities`), never a bare `console.error`.
- **Never navigate because a request failed.** A failed refresh raises the session flag and
  `<SessionExpiredDialog>` asks — a redirect from the api-client silently throws away
  whatever the user had half-typed.

## 16. Testing

→ [`docs/rules/16-testing.md`](docs/rules/16-testing.md)

Two layers. **If an assertion depends on a real layout, a real animation or a real
navigation, jsdom cannot see it and it belongs in Playwright.**

| Layer | Command | For |
|---|---|---|
| Vitest (jsdom) | `npm test` | Pure functions and component logic. ~1s. |
| Playwright | `npm run test:e2e` | The shared systems, desktop **and** mobile. |

- Vitest covers the modules whose failure mode is **silent**: money, dates, dirty-checking.
  Everything else fails loudly and `type-check` + `build` catch it.
- Test files sit beside the code; Playwright specs live in `e2e/`.
- **Every test carries a comment naming what breaks in production if it fails.**
- In Playwright, query only visible elements — `DataTable` renders both layouts and lets CSS
  choose, so a bare `.first()` can resolve to a hidden node. Use `visibleText()` from
  `e2e/fixtures/helpers.ts`.
- The e2e suite runs with **no backend** (`scripts/mock-api.mjs`). Keep it that way.
- Don't add a third runner.

## 17. PWA & offline

→ [`docs/rules/17-pwa-and-offline.md`](docs/rules/17-pwa-and-offline.md)

- The app is **installable, not offline**: a manifest and icons, and deliberately **no
  service worker**.
- If you add one: **never cache `/api/v1/*` or an authenticated page.** Cache Storage is
  unencrypted, on disk, and survives logout — one `NetworkFirst` rule over the API leaks the
  last user's records to the next person on that machine.
- Cache the shell and static assets only, version the cache name, clear caches in
  `useLogout`, and ship a kill switch.
- Offline **writes** need a queue and conflict handling. That is an architecture, not a
  plugin.

---

## Anti-patterns — an index

Each section above states its own don'ts. By topic: data flow §1–§4 · writes and toasts §5 ·
permissions §6, §13 · lists §7 · components and modals §8–§9 · colour §10 · types §11 · dates
and money §12 · downloads §14 · failures §15 · tests §16 · offline §17.

## New-feature checklist

Build `lib/<domain>/` in the order of the §1 table (`transformers.ts` carries its own
`asEnum`), then `components/<domain>/`: `<XView>` (DataView list) + `<XForm>` (RHF + zod) +
`<XDetailModal>` (shared `<Modal>`, `isDirty`) → the server `page.tsx` (metadata,
`<PageLayout>`) + `loading.tsx` → gate create/edit/delete with `usePermission` → register the
route in `config.ts` and the keys in `lib/permissions/` → tests for anything with a silent
failure mode → `npm run type-check && npm run lint && npm test && npm run build` all clean,
and `npm run test:e2e` before the PR.

`node ncube.js startdomain <Name>` scaffolds the whole shape, registration included, and
`npm run test:generator` proves its output passes type-check and lint. Change the generator
and that test together. `npm run dev:mock` runs the app against a fake backend that accepts
any login.
