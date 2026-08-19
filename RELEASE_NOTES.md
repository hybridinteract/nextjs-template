# Release Notes

All notable changes to this template are tracked here.
Follow [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`

| Bump type | When to use |
|-----------|-------------|
| `patch`   | Bug fixes, typo corrections, minor doc updates |
| `minor`   | New features, new shadcn components, new CLI commands — backwards-compatible |
| `major`   | Breaking structure changes, dependency major upgrades, architecture changes |

---

## [0.2.0] — 2026-08-19

Rebuilt most of the shared infrastructure from a production app this template seeded,
and fixed two things that had never worked. See
[`docs/TEMPLATE_UPDATE_PLAN.md`](docs/TEMPLATE_UPDATE_PLAN.md) for the reasoning and for
what was deliberately left behind.

### Fixed

- **Authenticated API calls now work.** They never did. `api-client` built browser URLs
  against `NEXT_PUBLIC_API_URL`, so every call went cross-origin to the backend while the
  httpOnly cookies sat on the Next origin — they never travelled. Meanwhile `proxy.ts`
  answered `/api/v1/*` with `NextResponse.next()`, but the app has no such route, so it
  returned a 404 HTML page and the backend was never contacted. Browser requests are now
  same-origin, and the proxy rewrites to the backend after attaching the token.
- **The proxy strips six spoofable hop headers** (`x-forwarded-for`, `x-real-ip` and
  friends) before forwarding. A browser can set them, and a backend reads them for rate
  limits and the audit trail.
- **`src/components/ui/` is now committed.** It used to be fetched from the shadcn registry
  by `ncube setup`, so a fresh clone failed `type-check` and `build` on ~25 missing modules
  and CI was red. `ncube setup` still works as a refresh.
- **`Permission` is a strict union again.** The `| string` in it collapsed the type to plain
  `string`, so a mistyped key compiled and returned `false` for every non-superuser — a
  silently missing button.
- **Modals now unmount.** framer-motion's `onAnimationComplete` does not fire in this setup,
  so every panel slid out of view and then stayed in the DOM. Unmount runs off a timer that
  shares one duration with the animation, and an e2e test now guards it.
- **Form labels are associated with their controls.** `<Field>` rendered a label with no
  `htmlFor`, so clicking it did nothing and a screen reader announced "edit text" with no
  name. It now wires `id`, `aria-invalid` and `aria-describedby`, honouring a control's own
  id when it has one.
- **`usePermission` takes `Permission`, not `string`.** The parameter type undid the strict
  union: a mistyped key compiled and returned false for everyone, so the button simply went
  missing.
- **`useLogin` primes the `/me` cache instead of invalidating it.** Nothing observes that
  query on the login page, so invalidation fetched nothing and the dashboard mounted with an
  empty sidebar. `useLogout` is a blocking mutation now, so it cannot be double-clicked.
- **`lint` runs clean.** `next lint` was removed in Next 16; the script is now `eslint .` on
  a flat config, and the 28 problems it surfaced are fixed rather than baselined.

### Added

- **DataView** (`@/components/data-view`) — the list system. URL-synced search, filters,
  sort and paging; server-driven; bulk actions; sortable headers; row selection. Four
  explicit display states, including an **error slot with retry** and a real **empty state**.
- **`<Modal>`** (`@/components/ui/modal`) — side panel on desktop, bottom sheet on mobile,
  with tabs, view↔edit mode, and an **unsaved-work guard**. Companions in `@/lib/forms`:
  `isFormDirty` and `useResetOnOpen`.
- **`@/lib/numeric`** — money and quantities as decimal strings on big.js, with one pinned
  locale.
- **`@/lib/date-utils` rewritten** plus **`@/lib/timezone`** — instants and business dates
  are different things, and the output format is fixed so it cannot be misread as mm/dd/yyyy.
- **`@/lib/reference` + `<ReferencePicker>`** — ungated dropdown feeds. Fixes the shape where
  a picker fed by a gated module list leaves a required field silently empty for anyone who
  may use the form but not browse the register.
- **Four error boundaries** — `app/error.tsx`, `global-error.tsx`, `not-found.tsx`, and
  `(dashboard)/dashboard/error.tsx`, which keeps the shell alive when one page crashes.
- **A session-expiry dialog** instead of a hard redirect from the api-client, which used to
  throw away anything half-typed.
- **Security headers** in `next.config.ts` — CSP, nosniff, frame options, referrer and
  permissions policy, COOP, and HSTS in production.
- **ESLint rules** that block `toLocale*String()`, `toISOString().slice(0,10)` and raw
  `Intl.NumberFormat` at error level. Only ESLint catches these.
- **Two test layers.** `npm test` is Vitest + Testing Library (jsdom) for pure modules and
  component logic — 36 tests, about a second. `npm run test:e2e` is Playwright across desktop
  and mobile viewports — 40 tests, covering what jsdom cannot see: that a modal actually
  leaves the DOM after closing, that the table becomes cards on a phone, that an
  authenticated request really reaches the backend. It starts its own mock API, so it runs
  with no backend.
- **`--success` / `--warning` / `--info` tokens** in both themes, plus `<StatusBadge>`,
  `<PageHeader>`, `<PageLayout>`, `<Field>` and `<DetailRow>`.
- **`node ncube.js remove <feature>`** — strips an optional subsystem cleanly: files, barrel
  exports, imports, dependencies and its rule doc, then type-checks and reports honestly.
  Seven are removable: permissions, numeric, reference, blocking-loading, data-view,
  dark-mode and the e2e layer. `docs/OPTIONAL_PARTS.md` is generated from the same manifest,
  so the two cannot drift.
- **Installable as a PWA** — manifest, icons (including a full-bleed maskable one),
  theme-color and `viewport-fit: cover`. **No service worker**, deliberately:
  `docs/rules/17-pwa-and-offline.md` explains why, and what to do when a project needs
  offline.
- **`CLAUDE.md`** and **`docs/rules/`** — the conventions as a guardrail, and one file per
  rule behind it.
- Mobile card layout in `DataTable`, nav grouping in the sidebar, `useOlderPages`,
  `usePrefersReducedMotion`, `withAuthRetry`, `downloadApiFile`, `logger`, `ifMatch`.

### Changed

- **Docs reorganised.** `FRONTEND_ARCHITECTURE_GUIDE_V2.md` → `docs/FRONTEND_ARCHITECTURE_GUIDE_V3.md`,
  rewritten as a narrative that links to `docs/rules/` rather than restating every rule.
- `useMediaQuery` uses `useSyncExternalStore`, so a desktop no longer flashes the mobile
  layout on first paint.
- `useTabState` reads `useSearchParams` and holds no local state — the URL is the only
  source of truth.
- `NavLinks` moved out of `DashboardShell`'s render; it was remounting the whole nav on
  every render.
- The `Toaster` is the theme-aware shadcn wrapper.
- CI runs type-check, lint, test and build.
- Node 22 in CI.

### Removed

- **`formatCurrency` and `formatNumber`** from `lib/utils.ts`. Both took a `locale` argument
  and did float maths on money. Use `@/lib/numeric`.
- **`store.ts` is no longer generated** per domain. List state lives in the URL; a store for
  it is a second source of truth the URL immediately contradicts.
- **`FRONTEND_LLM_PROMPT.md`.** It was a third copy of the same rules, kept in step by hand.
  `CLAUDE.md` is what an AI assistant reads.

---

## [0.1.0] — 2026-05-04

### 🎉 Initial Template Release

Production-ready Next.js 15 frontend template extracted and standardized from
internal Hybrid Interactive projects.

#### Included Infrastructure
- **`lib/auth/`** — BFF auth pattern: httpOnly cookies, login/me/refresh/logout BFF route handlers, `useMe` + `useLogin` + `useLogout` hooks
- **`lib/permissions/`** — Built-in RBAC: 4 default roles (`super_admin`, `admin`, `member`, `viewer`), `usePermission()` / `useFilteredNavItems()` hooks
- **`lib/loading/`** — Centralized blocking loading system: `useBlockingMutation`, `GlobalLoadingOverlay`, token-based concurrent tracking
- **`lib/api-client.ts`** — Stateless singleton HTTP client: 401 auto-refresh with deduplication, FastAPI 422 error flattening, typed `get/post/patch/put/delete/upload`
- **`components/layout/`** — `DashboardShell`: collapsible sidebar (desktop) + Sheet-based mobile nav, user dropdown, permission-gated nav items
- **`components/shared/`** — Generic `DataTable`, `StatsCard`, `lazy.tsx` registry
- **`proxy.ts`** — Route protection + API proxy auth injection
- **`ncube.js`** — CLI scaffolding tool (mirrors `fcube.py`)

#### Base Roles
- `super_admin` — Bypasses all permission checks
- `admin` — Full operational access
- `member` — Create + edit content
- `viewer` — Read-only

#### Tech Stack
- Next.js 15 (App Router, Turbopack), React 19, TypeScript 5
- Tailwind CSS v4 (CSS-native, no config file), shadcn/ui
- TanStack Query v5, Zustand v5
- React Hook Form v7 + Zod v3, Sonner v2, Framer Motion v12

#### CLI (`ncube.js`)
- `node ncube.js startdomain <Name>` — scaffold a complete feature domain
- `node ncube.js listdomains` — list existing domains
- `node ncube.js setup` — install shadcn/ui components
- `node ncube.js create <name> --variant base|rbac|full` — bootstrap a new project
- `node ncube.js bump patch|minor|major` — bump version + add changelog entry

---

<!-- ── RELEASE TEMPLATE ──────────────────────────────────────────────────────
Copy this block for each new release. Run `node ncube.js bump <patch|minor|major>`
to have it inserted automatically.

## [X.Y.Z] — YYYY-MM-DD

### Added
-

### Changed
-

### Fixed
-

### Removed
-
─────────────────────────────────────────────────────────────────────────── -->
