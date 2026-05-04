# Release Notes

All notable changes to this template are tracked here.
Follow [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`

| Bump type | When to use |
|-----------|-------------|
| `patch`   | Bug fixes, typo corrections, minor doc updates |
| `minor`   | New features, new shadcn components, new CLI commands — backwards-compatible |
| `major`   | Breaking structure changes, dependency major upgrades, architecture changes |

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
