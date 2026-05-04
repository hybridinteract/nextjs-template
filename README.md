# Next.js Frontend Template

A production-ready, opinionated Next.js frontend template by Hybrid Interactive. Mirrors the structure of the FastAPI template on the frontend.

**Architecture reference:** [`FRONTEND_ARCHITECTURE_GUIDE_V2.md`](./FRONTEND_ARCHITECTURE_GUIDE_V2.md)  
**LLM rules:** [`FRONTEND_LLM_PROMPT.md`](./FRONTEND_LLM_PROMPT.md)

---

## Tech Stack

| Concern | Library | Version |
|---------|---------|---------|
| Framework | Next.js (App Router) | 15.x |
| UI Library | React | 19.x |
| Component Primitives | **shadcn/ui** | latest |
| Server State | TanStack Query | 5.x |
| Client State | Zustand | 5.x |
| Styling | Tailwind CSS (v4, CSS-native) | 4.x |
| Forms | React Hook Form + Zod | RHF 7 + Zod 3 |
| Icons | Lucide React | latest |
| Toasts | Sonner | 2.x |
| Dark Mode | next-themes | 0.4.x |
| Animations | Framer Motion | 12.x |
| Auth | BFF pattern (httpOnly cookies) | — |
| RBAC | Built-in permissions system | — |

---

## Quick Start

### 1. Clone or create from template

```bash
# Option A: clone directly
git clone <repo-url> my-project
cd my-project

# Option B: bootstrap from template CLI (from the nextjs-template directory)
node ncube.js create my-project --variant rbac
cd ../my-project
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment

```bash
cp .env.example .env
# Edit .env — at minimum set NEXT_PUBLIC_API_URL
```

### 4. Install shadcn/ui components

```bash
node ncube.js setup
# or manually:
npx shadcn@latest add button input label card badge dialog dropdown-menu sheet table tabs skeleton avatar separator scroll-area form select checkbox switch textarea popover command
```

### 5. Start development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/                    # Unauthenticated pages (login, register)
│   │   └── login/page.tsx
│   ├── (dashboard)/               # Authenticated pages — permission-gated
│   │   ├── config.ts              # PermissionedNavItem[], ROUTES — NO JSX
│   │   ├── layout.tsx             # Auth sync → Zustand, dashboard shell
│   │   ├── loading.tsx            # Route skeleton
│   │   ├── page.tsx               # Dashboard home
│   │   └── <feature>/page.tsx    # One folder per feature
│   ├── api/
│   │   └── auth/                  # BFF route handlers (manage httpOnly cookies)
│   │       ├── login/route.ts
│   │       ├── me/route.ts
│   │       ├── refresh/route.ts
│   │       └── logout/route.ts
│   ├── globals.css                # Design tokens (single source of truth)
│   └── layout.tsx                 # Root layout + provider stack
│
├── components/
│   ├── layout/                    # DashboardShell (sidebar + main)
│   ├── loading/                   # GlobalLoadingOverlay, FullscreenLoader
│   ├── providers/                 # QueryProvider, ThemeProvider wrappers
│   ├── shared/                    # DataTable, StatsCard, lazy.tsx
│   └── ui/                        # shadcn/ui components (added via CLI)
│
├── hooks/                         # App-wide hooks (useMediaQuery, useDebounce)
│
├── lib/
│   ├── api-client.ts              # Singleton HTTP client (stateless)
│   ├── utils.ts                   # cn(), formatCurrency, formatDate
│   ├── date-utils.ts              # Date helpers (no external deps)
│   ├── auth/                      # Auth domain (types, api, hooks, store)
│   ├── permissions/               # RBAC (roles, permission checks, hooks)
│   ├── loading/                   # Blocking loading system (useBlockingMutation)
│   └── hooks/                     # Shared hooks (useTabState, useZustandTabSync)
│
├── middleware.ts                  # Route protection + API proxy auth injection
└── types/
    └── index.ts                   # AppError, NavItem, global types
```

---

## Variants

Three variants are available via the CLI:

| Variant | Includes | Use when |
|---------|----------|----------|
| `base` | Auth, layout shell, no RBAC | Simple internal tools, single-role apps |
| `rbac` *(default)* | Base + full permissions/RBAC system | Most SaaS apps, multi-role dashboards |
| `full` | RBAC + access-control admin panel | Platforms with custom role management |

```bash
node ncube.js create my-app --variant base
node ncube.js create my-app --variant rbac   # default
node ncube.js create my-app --variant full
```

---

## NCube CLI — Domain Scaffolding

The `ncube.js` CLI mirrors the FastAPI `fcube.py` module generator. It scaffolds complete feature domains following the architecture conventions.

```bash
# Scaffold a new domain
node ncube.js startdomain Product
node ncube.js startdomain LeadManagement
node ncube.js startdomain InvoiceItem

# List existing domains
node ncube.js listdomains

# Install shadcn/ui components
node ncube.js setup

# Bootstrap a new project
node ncube.js create my-app [--variant base|rbac|full]
```

### What `startdomain` generates

Running `node ncube.js startdomain Product` creates:

```
src/lib/product/
├── types.ts          # Backend* + Frontend types + Zod schemas + status constants
├── transformers.ts   # snake_case ↔ camelCase conversions
├── api.ts            # Service functions via apiClient
├── hooks.ts          # React Query hooks + query key factory
├── store.ts          # Zustand UI state (modals, filters)
└── index.ts          # Barrel exports

src/components/product/
├── product-list.tsx  # DataTable with search + create button
├── product-form.tsx  # Dialog with create/edit/view modes
└── index.ts          # Barrel exports

src/app/(dashboard)/product/
└── page.tsx          # Feature page
```

After running, follow the printed checklist to:
1. Add your backend field types to `types.ts`
2. Map fields in `transformers.ts`
3. Add form fields in `product-form.tsx`
4. Register the route in `(dashboard)/config.ts`

---

## Adding a New Feature (Manual Checklist)

```
□ 1. node ncube.js startdomain <Name>
□ 2. Add backend + frontend types to src/lib/<name>/types.ts
□ 3. Complete transformers in src/lib/<name>/transformers.ts
□ 4. Add form fields in src/components/<name>/<name>-form.tsx
□ 5. Add PermissionedNavItem to src/app/(dashboard)/config.ts
□ 6. Add permissions to src/lib/permissions/config.ts
```

---

## Authentication

Authentication uses the **BFF (Backend-for-Frontend) pattern**:

- Tokens are stored in **httpOnly cookies** — JavaScript never reads them
- The `/api/auth/*` route handlers proxy auth to the backend and set cookies
- `src/middleware.ts` injects `Authorization: Bearer <token>` for `/api/v1/*` routes
- On 401: `apiClient` auto-refreshes and retries once, then redirects to `/login`

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/login` | POST | Proxy login, set httpOnly cookies (access: 2hr, refresh: 7d) |
| `/api/auth/me` | GET | Return current user, silently refresh if expired |
| `/api/auth/refresh` | POST | Rotate tokens, set new cookies |
| `/api/auth/logout` | POST | Clear cookies |

---

## Permission System

Built-in RBAC with 4 default roles. Customize in `src/lib/permissions/config.ts`.

```ts
// Permission format: "resource.action"
const canManage = usePermission("content.manage");
const canViewOrManage = useAnyPermission(["content.view", "content.manage"]);

// Gate a nav item
{ name: "Settings", href: "/dashboard/settings", permission: "settings.view" }
```

**Default roles:** `super_admin` → `admin` → `member` → `viewer`

`super_admin` always passes all permission checks.

---

## Design Tokens

All design tokens live in `src/app/globals.css` — the single source of truth for colors, radius, and spacing. Tailwind v4 uses CSS-native configuration (no `tailwind.config.js`).

```css
/* Customize in globals.css */
:root {
  --primary: oklch(0.205 0 0);  /* your brand color */
  --radius: 0.625rem;
}
```

Use semantic tokens in components — **never** hardcode hex colors:
```tsx
className="bg-background text-foreground border-border"
className="text-primary bg-muted text-muted-foreground"
```

---

## Blocking Loading System

All mutations use `useBlockingMutation` instead of raw `useMutation`. This automatically shows a global loading overlay during async operations.

```ts
// In hooks.ts — use this instead of useMutation
export function useCreateProduct() {
  return useBlockingMutation(
    { mutationFn: productApi.createProduct, onSuccess: () => toast.success("Created") },
    { source: "mutation", label: "Creating product…" },
  );
}
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_APP_NAME` | No | App display name |
| `NEXT_PUBLIC_APP_URL` | No | App URL (default: http://localhost:3000) |
| `NEXT_PUBLIC_API_URL` | **Yes** | Backend API base URL (e.g., http://localhost:8000) |

---

## Customizing Design Tokens

To brand the template for a specific project, update the CSS variables in `src/app/globals.css`:

```css
:root {
  --primary: oklch(0.6 0.2 250);   /* your brand primary */
  --radius: 0.75rem;               /* border radius */
}
.dark {
  --primary: oklch(0.7 0.2 250);
}
```

Use [oklch.com](https://oklch.com) to find your brand colors in the oklch color space.

---

## Engineering Conventions

See [FRONTEND_ARCHITECTURE_GUIDE_V2.md](./FRONTEND_ARCHITECTURE_GUIDE_V2.md) for the full guide, including:

- Domain colocation rules
- Server state vs client state (the most common mistake)
- API layer architecture
- Component sizing limits
- TypeScript conventions
- Error handling patterns
- Form handling

For LLM-assisted development, feed [FRONTEND_LLM_PROMPT.md](./FRONTEND_LLM_PROMPT.md) as your system prompt.
