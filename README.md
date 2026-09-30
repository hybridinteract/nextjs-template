# Next.js Frontend Template

Hybrid Interactive's Next.js frontend template. It pairs with the FastAPI backend template
and mirrors its module structure.

**Conventions (read first):** [`CLAUDE.md`](./CLAUDE.md). The one-page guardrail.  
**The rules, one per file:** [`docs/rules/`](./docs/rules/README.md)  
**How it fits together:** [`docs/FRONTEND_ARCHITECTURE_GUIDE_V3.md`](./docs/FRONTEND_ARCHITECTURE_GUIDE_V3.md)  
**All documentation:** [`docs/README.md`](./docs/README.md)

Claude Code reads `CLAUDE.md` by itself. Point any other AI tool at it.

---

## Quick start

1. On the [template repo](https://github.com/hybridinteractive/nextjs-template), click
   **Use this template**, create your repo, and clone it.
2. Install and name the project:

   ```bash
   npm install
   node ncube.js init my-app   # sets the name in package.json and creates .env
   ```

3. Open the app before the backend exists:

   ```bash
   npm run dev:mock
   ```

   Open [http://localhost:3000](http://localhost:3000). That is the public home page, a
   placeholder in `src/app/(site)`. Click "Sign in" and use any email and password. A
   small fake backend (`scripts/mock-api.mjs`) says yes to every login. The
   real login flow still runs: cookies, the proxy and `/me` all work as they will in
   production.

   Then open [/dashboard/design](http://localhost:3000/dashboard/design). It shows every
   shared part the template has, in both themes. Build screens by copying from it.

4. When your FastAPI backend is running, set `NEXT_PUBLIC_API_URL` in `.env`, then:

   ```bash
   npm run dev
   ```

---

## Change these for a new project

The template's defaults are for India. Each one is set in a single place.

| What | Where |
|---|---|
| App name | `node ncube.js init <name>` sets it in `package.json` and in `.env` (`NEXT_PUBLIC_APP_NAME`). The page title, the sidebar and the install manifest read it from there. |
| Time zone and clock | `DEFAULT_TIME_ZONE` in `src/lib/date-utils.ts`. Default `Asia/Kolkata`, with a 12-hour clock. |
| Number format | `NUMBER_LOCALE` in `src/lib/numeric/decimal.ts`. Default `en-IN`, so ₹12,75,000. |
| Currency | `DEFAULT_CURRENCY` in `src/lib/numeric/money.ts`. Default `INR`. |
| Brand colours and radius | The tokens in `:root` and `.dark` in `src/app/globals.css`. Nothing else. [oklch.com](https://oklch.com) converts your brand colours. |
| Fonts | Geist and Geist Mono, loaded in `src/app/layout.tsx`. |
| App icons | The four files in `public/icons/`, and the colours in `src/app/manifest.ts`. |
| Parts you won't use | `node ncube.js remove --list`. See [Trim what you don't need](#trim-what-you-dont-need). |

---

## Build a module

```bash
node ncube.js startdomain Category
node ncube.js startdomain Person --plural People   # when the plural isn't just +s
```

For `Category` it writes:

```
src/lib/categories/          types, transformers, api, hooks, index
src/components/categories/   category-view.tsx            the list, on DataView
                             category-detail-modal.tsx    view, create and edit, with the unsaved-work guard
                             category-form.tsx            react-hook-form + zod
                             delete-category-button.tsx   with a confirm
src/app/(dashboard)/dashboard/categories/   page.tsx, loading.tsx
```

It also adds the sidebar item and the route to `src/app/(dashboard)/config.ts`, and four
permission keys (view, create, edit, delete) to `src/lib/permissions/`.

The output already follows the rules in `CLAUDE.md`. It type-checks and lints clean on the
first run, and `npm run test:generator` proves that on every CI run. If you removed
permissions or the blocking overlay, it writes code without them.

The module starts with two fields, a name and a status. Then:

```
□ 1. Match src/lib/<module>/types.ts to the backend: the Backend* shape, the frontend
     shape, the zod schema and the payloads
□ 2. Map the fields in transformers.ts. asEnum on every enum.
□ 3. Add the form fields in <name>-form.tsx and the columns in <name>-view.tsx
□ 4. Check the API path in api.ts against the FastAPI router
□ 5. Check the backend permission names in src/lib/permissions/check.ts
□ 6. If another module picks this one by id, add it to REFERENCE_RESOURCES
□ 7. npm run type-check && npm run lint && npm test && npm run build
```

`npm run dev:mock` shows the new page straight away. Its list shows an error with a retry
button until the backend has the route. That is the error state working.

The full checklist, with the reason for each step, is at the bottom of
[`CLAUDE.md`](./CLAUDE.md).

---

## Trim what you don't need

Dead code is worse than no code. It gets read, maintained and copied into new modules.
Take it out early, while it is easy.

```bash
node ncube.js remove --list
node ncube.js remove permissions --dry-run   # see what it would touch
node ncube.js remove permissions             # do it
```

Eight parts can go: permissions, decimal money, reference pickers, the blocking overlay,
DataView, the Playwright suite, dark mode and the public site. The command deletes the files, undoes the
imports, drops the dependencies and removes the matching rule doc. Then it runs
`tsc --noEmit` and tells you whether the project still compiles.

Commit first, so you can undo it. Details are in
[`docs/OPTIONAL_PARTS.md`](./docs/OPTIONAL_PARTS.md).

---

## Checks

All four must pass before a change is done:

```bash
npm run type-check   # tsc --noEmit
npm run lint         # clean today. Keep it that way.
npm test             # Vitest: pure modules and component logic, about 1s
npm run build        # catches what type-check can't
```

CI runs those four, plus two more:

```bash
npm run check:docs       # every markdown link resolves, rule stamps are recent
npm run test:generator   # startdomain's output type-checks and lints
```

Before a PR, run the browser suite on your machine. CI doesn't run it.

```bash
npm run test:e2e     # Playwright: the shared systems, desktop and mobile
```

It starts its own fake backend, so nothing else needs to be running.

Lint also holds the design rules: no raw Tailwind palette, no hex, no made-up sizes, and
no raw `<button>` or `<input>` in feature code. See `docs/rules/10-styling.md`.

**Using Claude Code?** `.claude/settings.json` lints every file Claude edits and hands the
errors straight back to it. So Claude fixes a rule it broke on the spot, not at the end. The
`build-ui` skill (`.claude/skills/build-ui/`) sends Claude to the design page before it
builds a screen.

---

## ncube commands

| Command | What it does |
|---|---|
| `node ncube.js init [name]` | Names the project and creates `.env`. Run once after cloning. |
| `node ncube.js startdomain <Name> [--plural <Plural>]` | Writes a module. See [Build a module](#build-a-module). |
| `node ncube.js listdomains` | Lists the modules in `src/lib/`. |
| `node ncube.js remove <part> [--dry-run]` | Takes out an optional part. `--list` shows them. |
| `node ncube.js setup` | Runs the shadcn/ui installer. `init` runs it only when `src/components/ui/` is missing. The components ship with the template and some carry local fixes, like the z-index ladder, so don't run this to update them. |
| `node ncube.js bump <patch\|minor\|major>` | Bumps the version and adds a RELEASE_NOTES entry. |

---

## Tech stack

| Concern | Library | Version |
|---------|---------|---------|
| Framework | Next.js (App Router) | 16.x |
| UI library | React | 19.x |
| Component primitives | shadcn/ui | latest |
| Server state | TanStack Query | 5.x |
| Client state | Zustand | 5.x |
| Styling | Tailwind CSS (v4, CSS-native) | 4.x |
| Forms | React Hook Form + Zod | RHF 7, Zod 3 |
| Icons | Lucide React | latest |
| Toasts | Sonner | 2.x |
| Dark mode | next-themes | 0.4.x |
| Animations | Framer Motion | 12.x |
| Decimal math | big.js | 7.x |
| Auth | BFF pattern (httpOnly cookies) | built in |
| Permissions | Role-based, built in | built in |
| Unit tests | Vitest + Testing Library | 4.x |
| Browser tests | Playwright | 1.x |

---

## Project structure

```
src/
├── app/
│   ├── (site)/                    # The public site: "/" and anything else anyone can read.
│   │   ├── layout.tsx             # Header and footer. No providers, so it stays light.
│   │   └── page.tsx               # The home page, a placeholder
│   ├── (auth)/                    # Sign-in pages
│   │   ├── layout.tsx             # Mounts AppProviders
│   │   └── login/page.tsx
│   ├── (dashboard)/               # Pages behind the login
│   │   ├── config.ts              # Sidebar items and ROUTES. Plain data, no JSX.
│   │   ├── layout.tsx             # Mounts AppProviders, loads the user and role, renders the shell
│   │   └── dashboard/
│   │       ├── layout.tsx         # export const dynamic = "force-dynamic"
│   │       ├── error.tsx          # A page can crash without taking the shell
│   │       ├── loading.tsx        # Route skeleton
│   │       └── <module>/page.tsx  # Server component
│   ├── api/auth/                  # BFF route handlers. The only code that touches cookies.
│   ├── error.tsx  global-error.tsx  not-found.tsx
│   ├── globals.css                # Design tokens. Every colour lives here.
│   └── layout.tsx                 # Fonts, metadata and the theme. Nothing else.
│
├── components/
│   ├── data-view/                 # The list system: toolbar, table, paging, bulk actions
│   ├── design/                    # The design page at /dashboard/design
│   ├── ui/                        # shadcn primitives, plus Modal, StatusBadge, PageHeader
│   ├── shared/                    # DataTable, ReferencePicker, Field, DetailRow, lazy
│   ├── layout/                    # DashboardShell, PageLayout
│   ├── loading/                   # The blocking overlay
│   ├── auth/                      # SessionExpiredDialog
│   └── providers/                 # AppProviders and QueryProvider
│
├── hooks/                         # useMediaQuery, useDebounce, useOlderPages
│
├── lib/
│   ├── api-client.ts              # The one HTTP client. Stateless, same-origin.
│   ├── auth/                      # BFF auth and the session-expiry store
│   ├── permissions/               # Roles, the Permission type, hooks, backend mapping
│   ├── loading/                   # useBlockingMutation and the overlay store
│   ├── numeric/                   # Money and quantities on big.js, as decimal strings
│   ├── date-utils.ts  timezone.ts # Instants vs business dates
│   ├── forms/                     # isFormDirty, useResetOnOpen
│   ├── reference/                 # Ungated dropdown feeds
│   ├── utilities/                 # Downloads, logger
│   ├── hooks/                     # useTabState, useZustandTabSync
│   └── <module>/                  # types → transformers → api → hooks → index
│
├── proxy.ts                       # Route protection and the API rewrite to the backend
└── types/index.ts                 # AppError, NavItem, shared shapes

scripts/                           # dev:mock and its fake backend, the doc and generator checks, the Claude lint hook
docs/
├── README.md                      # Documentation index
├── rules/                         # One rule per file. The detail behind CLAUDE.md.
├── OPTIONAL_PARTS.md              # What you can remove, and how
└── FRONTEND_ARCHITECTURE_GUIDE_V3.md
```

---

## Authentication

The **BFF (Backend-for-Frontend) pattern**. The Next.js server holds the tokens, not the
browser.

- Tokens sit in **httpOnly cookies**, so JavaScript never reads them.
- The `/api/auth/*` route handlers pass login to the backend and set the cookies.
- `src/proxy.ts` adds `Authorization: Bearer <token>` to every `/api/v1/*` call.
- On a 401, `apiClient` refreshes once and retries. If the refresh fails too, a dialog
  says the session expired and asks you to sign in again. Nothing redirects on its own,
  so a half-typed form isn't lost.

| Route | Method | What it does |
|-------|--------|-------------|
| `/api/auth/login` | POST | Passes login to the backend, sets the cookies (access 2 hours, refresh 7 days) |
| `/api/auth/me` | GET | Returns the current user, and refreshes quietly if the access token expired |
| `/api/auth/refresh` | POST | Rotates both tokens |
| `/api/auth/logout` | POST | Clears the cookies |

---

## Permissions

```ts
// Frontend keys are "resource.action". The backend's are "resource:action".
const canCreate = usePermission("categories.create");

// Gate a sidebar item in src/app/(dashboard)/config.ts
{ name: "Categories", href: "/dashboard/categories", icon: LayoutList, permission: "categories.view" }
```

The built-in roles are `super_admin`, `admin`, `member` and `viewer`, in
`src/lib/permissions/types.ts`. `super_admin` and superusers pass every check.
`src/lib/permissions/check.ts` maps each frontend key to the backend permissions that grant
it. Hiding a button is only for the UI. The backend is the real guard.

---

## Environment variables

| Variable | Required | What it is |
|----------|----------|-------------|
| `NEXT_PUBLIC_APP_NAME` | No | The app's display name |
| `NEXT_PUBLIC_APP_URL` | No | The app's URL (default http://localhost:3000) |
| `NEXT_PUBLIC_API_URL` | **Yes** | The backend's base URL, like http://localhost:8000. `npm run dev:mock` sets it for you. |

---

## Engineering conventions

Three documents, three jobs:

| Document | What it is for |
|---|---|
| [`CLAUDE.md`](./CLAUDE.md) | **The guardrail.** Every convention on one page, and the new-feature checklist. Claude Code reads it by itself. |
| [`docs/rules/`](./docs/rules/README.md) | **The rules, one per file.** What each rule is, how it works here, what was left out on purpose, and the commands that prove the file still matches the code. |
| [`docs/FRONTEND_ARCHITECTURE_GUIDE_V3.md`](./docs/FRONTEND_ARCHITECTURE_GUIDE_V3.md) | **The story.** How the pieces fit together, and one request followed from start to end. |

Each rule lives in one place, in `docs/rules/`. Everything else says it briefly and links
there, so a rule change means editing one file.
