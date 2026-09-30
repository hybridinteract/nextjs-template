# Release Notes

All notable changes to this template are tracked here.
Follow [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`

| Bump type | When to use |
|-----------|-------------|
| `patch`   | Bug fixes, typo corrections, minor doc updates |
| `minor`   | New features, new shadcn components, new CLI commands — backwards-compatible |
| `major`   | Breaking structure changes, dependency major upgrades, architecture changes |

---

## [Unreleased]

Fixes that Influen and Herbally IP found after they were built from 0.2.0, defaults
that match the projects this template is actually used for, and a module generator
whose output you can keep.

### Fixed

- **A `<Select>`, dropdown, popover or tooltip opened inside a `<Modal>` now opens on top
  of it.** The modal sat at `z-[100]` and every popper at `z-50`, so the option list painted
  behind the panel and the control looked dead. Every portalled layer now takes its z-index
  from a named ladder in `globals.css` (`--z-modal`, `--z-dialog`, `--z-popper`,
  `--z-tooltip`). A Playwright test clicks an option inside a modal and checks it is the
  topmost element. It failed before the fix, on desktop and mobile.
- **September prints as "Sep", like every other month.** Newer ICU spells it "Sept" in
  `en-GB`, and only that month. `date-utils` now cuts every short month to three letters.
- **The login route no longer passes FastAPI's raw `detail` through as the message.** On a
  422 that is a list of issues, not a sentence. A new `detailToMessage`
  (`src/lib/backend-error.ts`) turns a string, a 422 issue list or a `{ message }` object
  into words. The api-client uses it too, so a `{ message }` refusal no longer shows as
  "Request failed with status 403".
- **`<Toaster>` is mounted first, not last.** Sonner's Toaster only shows toasts raised
  after its own effect subscribes, and React runs later siblings' effects later. A toast
  raised while a page mounted went nowhere.
- **A deliberate sign-out can no longer raise "Your session has ended".** The session
  store has an `isSigningOut` flag, raised before the logout request. The plain template
  did not show this, but Influen did as soon as its logout cleared a saved store, and so
  would any project that follows rule 17 and clears things on logout.
- Four links to `docs/TEMPLATE_UPDATE_PLAN.md`, removed in the last release, now point to
  git history. The README's Variants table, which described an admin panel that does not
  exist, is gone. The README checklist named a `permissions/helpers.ts` that does not exist.
- **`ncube startdomain` writes code that passes lint and follows the rules.** Its output
  used to fail `npm run lint` on the first run (a `toLocaleDateString()`), and it wrote a
  Zustand store, a raw `<button>`, a shadcn `Dialog` with no unsaved-work guard and plain
  `useMutation`. Nothing noticed, because nothing ran it. See Changed for what it writes now.
- **`ncube remove` no longer leaves dead links.** Removing permissions, reference pickers or
  DataView deleted the rule doc but left up to four links into it. Those links now become
  plain text marked as removed.
- **The README said a failed refresh redirects to `/login`.** It shows the session-expired
  dialog, and has since 0.2.0. The README also described the old generator's output and
  the removed `create` command.

### Changed

- **The defaults are India.** `DEFAULT_TIME_ZONE` is `"Asia/Kolkata"` (was `"UTC"`), times
  are 12-hour by default, and `NUMBER_LOCALE` is `"en-IN"` (was `"en-GB"`), so amounts group
  as ₹12,75,000. New `DEFAULT_CURRENCY = "INR"` in `@/lib/numeric`. Influen inherited UTC and
  every time on screen read 5.5 hours behind. Both projects switched the locale by hand.
  For a project outside India, change the three constants once.
- **`ncube startdomain` is rewritten.** It writes a DataView list, a `<Modal>` with `isDirty`
  and view/edit modes, a react-hook-form + zod form, a delete button with a confirm, a
  query-key factory, `useBlockingMutation` with invalidation inside the `mutationFn`, and
  `asEnum` and `formToPayload` in the transformer. It registers the sidebar item, the route
  and the permission keys itself, and prints the lines to add by hand if a file no longer
  matches. Folders, route and API path are plural (`categories`), like the backend's routes.
  `--plural` handles names like Person. If you removed permissions or the blocking overlay,
  it writes code without them. It stops before writing anything if the module exists.
- **The mock backend moved from `e2e/fixtures/` to `scripts/mock-api.mjs`**, because
  `dev:mock` uses it too. Otherwise `ncube remove e2e`, which `remove numeric` and
  `remove data-view` need first, would have deleted it.
- **CI no longer runs the Playwright suite.** Run `npm run test:e2e` on your machine before
  a PR, as Influen and Herbally IP already do. CI now also runs `check:docs` and
  `test:generator`.
- `config.ts` lost its Settings, Users and Access Control sidebar items. Those pages do not
  exist, so the links went to a 404.
- The README is rewritten: one quick start, a table of what to change for a new project,
  and no legacy sections.

### Added

- **`npm run dev:mock`** runs the app against a fake backend that accepts any login, so
  you can open the app before the real backend exists. Ported from Herbally IP.
- **`npm run test:generator`** runs `startdomain` in throwaway copies of the project, with
  and without permissions and the blocking overlay, then type-checks and lints the result.
- **`npm run check:docs`** fails on a dead markdown link or a rule with no "Last verified"
  stamp, and warns about stamps older than 30 days. Ported from Influen.
- **A Claude Code hook** (`.claude/settings.json`, `scripts/claude-lint-hook.mjs`) lints
  every file Claude edits and hands the errors straight back. Ported from Herbally IP.

### Removed

- **`ncube create` and its `--variant` flag.** Deprecated since May 2026. Use GitHub's
  "Use this template" and `ncube init`.

---

## [0.2.0] — 2026-08-19

Rebuilt most of the shared infrastructure from a production app this template seeded,
and fixed two things that had never worked. The plan behind it, with the reasoning and
what was deliberately left behind, was removed once the work was done. Read it with
`git show 7086b93:docs/TEMPLATE_UPDATE_PLAN.md`.

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
