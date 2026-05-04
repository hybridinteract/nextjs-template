# Frontend Architecture Guide v2

> **Purpose:** A universal, framework-agnostic reference for building production-grade frontend applications. Feed this entire document as a system prompt or project context to any LLM before scaffolding a new project. Every rule here is a hard constraint.
>
> **Scope:** The architectural principles apply universally. Examples use Next.js + React + TypeScript, but substitute your framework and keep the principles.

---

## Table of Contents

1. [Core Principles](#1-core-principles)
2. [Project Structure](#2-project-structure)
3. [Routing & Navigation](#3-routing--navigation)
4. [API Layer](#4-api-layer)
5. [Server Components & Server Actions](#5-server-components--server-actions)
6. [State Management](#6-state-management)
7. [Component Architecture](#7-component-architecture)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [Styling & Design Tokens](#9-styling--design-tokens)
10. [TypeScript Conventions](#10-typescript-conventions)
11. [Error Handling](#11-error-handling)
12. [Form Handling](#12-form-handling)
13. [Performance](#13-performance)
14. [Testing Strategy](#14-testing-strategy)
15. [Module Configuration Pattern](#15-module-configuration-pattern)
16. [Provider Composition](#16-provider-composition)
17. [Adding a New Feature (Checklist)](#17-adding-a-new-feature-checklist)
18. [Do's and Don'ts](#18-dos-and-donts)
19. [Appendix: Recommended Tech Stack](#appendix-recommended-tech-stack)
20. [Appendix: Blocking Loading System](#appendix-blocking-loading-system)
21. [Appendix: Tab Persistence Pattern](#appendix-tab-persistence-pattern)
22. [Appendix: PDF Generation System](#appendix-pdf-generation-system)
23. [Appendix: Engineering Improvement Recommendations](#appendix-engineering-improvement-recommendations)

---

## 1. Core Principles

These six rules override everything else. When in doubt, refer back here.

| #   | Principle                       | What it means                                                                                                                                                                                                                                          |
| --- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Domain colocation**           | Group code by business domain, not by technical layer. All files for "leads" live in one folder. No scattering across `api/services/`, `store/`, `api/types/`.                                                                                         |
| 2   | **Single responsibility**       | Each file does exactly one thing. One component per file. One store per domain. One transformer per domain. One hook per concern.                                                                                                                      |
| 3   | **Server state ≠ Client state** | Data from the API is **server state** (React Query / SWR). UI toggles, auth sessions, sidebar state is **client state** (Zustand / Pinia / Svelte stores). Never mix them. Never put `isLoading`, `error`, `items[]`, or `fetchX()` in a client store. |
| 4   | **Transform at the boundary**   | Backend shapes (`snake_case`) are converted to frontend shapes (`camelCase`) **exactly once**, in the service/API layer. No backend shapes leak into components.                                                                                       |
| 5   | **Explicit over implicit**      | Type every function. Name every constant. Export through barrels. No magic strings, no `any`, no implicit return types.                                                                                                                                |
| 6   | **Minimal coupling**            | Each domain should be self-contained. A change in `leads/` should never require touching `meetings/`. Shared logic goes in `lib/shared/` or `lib/utils/`.                                                                                              |

### Why These Matter

Violating principle 3 is the single most common mistake in frontend projects. When you put API data into a Zustand/Pinia store with manual `isLoading` flags, `fetchX()` methods, and `items[]` arrays, you lose:

- **Automatic caching** — the same data re-fetched on every mount
- **Background refetching** — stale data shown until manual refresh
- **Race condition handling** — rapid navigation causes state corruption
- **Cache invalidation** — manual `refetch()` calls scattered everywhere
- **Deduplication** — two components mounting = two API calls

A server-state library (React Query, SWR, Apollo) solves all of these. Your client store should only hold **things that don't exist on the server**: selected tab, sidebar collapsed, modal open/close, theme preference.

---

## 2. Project Structure

```
.
├── src/
│   ├── app/                              # Framework router (Next.js App Router / equivalent)
│   │   ├── (auth)/                       # Unauthenticated pages (login, signup, forgot-password)
│   │   ├── (dashboard)/                  # Authenticated dashboard — permission-gated, not role-gated
│   │   │   ├── config.ts                 # Nav items (with permissions), route constants — NO JSX
│   │   │   ├── layout.tsx                # Dashboard shell wrapper — syncs auth, filters nav
│   │   │   ├── loading.tsx               # Route-segment loading skeleton
│   │   │   └── <feature>/               # One folder per feature (flat, not nested under roles)
│   │   │       └── page.tsx
│   │   ├── api/                          # Route handlers (BFF layer for auth cookies, proxying)
│   │   │   └── auth/                     # login, me, refresh, logout — httpOnly cookie management
│   │   ├── globals.css                   # Design tokens & global styles (single source of truth)
│   │   ├── layout.tsx                    # Root layout — provider composition
│   │   └── page.tsx                      # Root redirect handler
│   │
│   ├── components/
│   │   ├── <domain>/                     # Domain-specific UI components (forms, lists, views)
│   │   │   ├── <component-name>.tsx      # One component per file
│   │   │   └── index.ts                  # Barrel export for the domain's components
│   │   ├── layout/                       # Shell layout (sidebar, top nav, mobile dock)
│   │   ├── loading/                      # Global loading overlay, route loading, fullscreen loader
│   │   ├── providers/                    # Context providers — no visual output
│   │   ├── shared/                       # Truly cross-domain reusable components
│   │   │   ├── index.ts                  # Barrel — ALL shared imports go through here
│   │   │   └── <component-name>/
│   │   │       └── index.tsx
│   │   └── ui/                           # Primitives (Button, Badge, Input, Modal, Tabs…)
│   │
│   ├── hooks/                            # App-wide custom hooks (useMediaQuery, useDebounce, etc.)
│   │
│   ├── lib/                              # Business logic & state — DOMAIN-BASED
│   │   ├── api-client.ts                 # Singleton HTTP client — the ONLY place fetch is called
│   │   ├── utils.ts                      # Pure utilities (cn, formatCurrency, formatDate)
│   │   ├── date-utils.ts                 # Date utilities (no external deps, YYYY-MM-DD strings)
│   │   ├── <domain>/                     # One folder per business domain
│   │   │   ├── api.ts                    # Service functions — calls apiClient, returns frontend types
│   │   │   ├── hooks.ts                  # React Query hooks (useQuery / useMutation)
│   │   │   ├── store.ts                  # Client state store (UI-only — optional)
│   │   │   ├── transformers.ts           # Backend ↔ Frontend shape conversions
│   │   │   ├── types.ts                  # Domain types (Backend* + Frontend shapes + Zod schemas + constants)
│   │   │   └── index.ts                  # Barrel — export only what other code needs
│   │   ├── auth/                         # Auth domain — login, session, user shape
│   │   ├── permissions/                  # RBAC — role definitions, permission checks, hooks
│   │   ├── access-control/               # Admin panel — dynamic role/permission CRUD
│   │   ├── loading/                      # Centralized blocking loading system
│   │   ├── hooks/                        # Shared lib-level hooks (tab state, Zustand-URL sync)
│   │   └── pdf/                          # PDF generation (jsPDF templates for docs)
│   │
│   ├── proxy.ts                      # Route protection + API auth injection
│   └── types/                            # System-wide global TypeScript types & enums
│
├── public/                               # Static assets (images, icons, SVGs)
├── next.config.ts                        # Framework configuration
├── tsconfig.json                         # TypeScript — path aliases configured here
└── package.json
```

### Why Domain-Based?

| Layer-Based (avoid)                  | Domain-Based (use this)             |
| --------------------------------------- | -------------------------------------- |
| All API services in `api/services/`     | Each domain owns its `api.ts`          |
| All stores in `store/`                  | Each domain owns its `store.ts`        |
| All types in `api/types.ts`             | Each domain owns its `types.ts`        |
| All transformers in one file            | Each domain owns its `transformers.ts` |
| Finding lead code = search 4+ folders   | Finding lead code = open `lib/leads/`  |
| Adding a domain = edit 4+ layer folders | Adding a domain = create 1 folder      |

**The test:** If you search the codebase for "where does lead data get fetched, transformed, cached, and typed?" — the answer should be **one folder**: `lib/leads/`. If the answer involves 4+ directories, you have a layer-based structure that will not scale.

### Domain Folder Template

Every domain folder follows this exact structure. No exceptions.

```
lib/<domain>/
├── api.ts              # Service functions (fetchLeads, createLead, etc.)
├── hooks.ts            # React Query hooks (useLeads, useCreateLead, etc.)
├── store.ts            # Zustand store — ONLY if this domain needs shared UI state
├── transformers.ts     # snake_case ↔ camelCase conversions
├── types.ts            # Backend* (snake_case) + Frontend (camelCase) + Zod schemas + constants
└── index.ts            # Barrel exports
```

> **Note on `constants.ts`:** Status arrays, label maps, and color maps are typically colocated in `types.ts` alongside the types they describe. Only extract to `constants.ts` if `types.ts` exceeds ~200 lines. Zod validation schemas also live in `types.ts` — not in a separate `schemas.ts`.

### Domain Component Folder

Every business domain also has a **parallel component folder** in `components/<domain>/`:

```
components/<domain>/
├── <domain>-list.tsx         # List view (search, filter, pagination, bulk select)
├── <domain>-form.tsx         # Create/edit modal or page wrapper
├── <domain>-edit-form.tsx    # Form internals (React Hook Form + Zod)
├── <domain>-view-details.tsx # Read-only detail view
├── index.ts                  # Barrel export
└── ...                       # Sub-entity components as needed
```

This gives you **two folders per domain**: `lib/<domain>/` for logic + state, `components/<domain>/` for UI. Finding everything about leads means checking two places — both named the same.

---

## 3. Routing & Navigation

### Route Group Convention

Use framework grouping mechanisms (parenthesized folders in Next.js) to organize pages without affecting the URL:

- `(auth)/` — Unauthenticated pages (login, signup). No shared layout with dashboard.
- `(dashboard)/` — All authenticated pages. **Flat feature folders, not nested under roles.** Access is controlled by permissions, not by folder structure.

### Permission-Gated Flat Routing

All roles share the same URL space. Visibility is controlled by a **permission declaration** on each nav item:

```ts
// (dashboard)/config.ts
import { Target, Building2, HardHat } from "lucide-react";
import type { PermissionedNavItem } from "@/lib/permissions";

export const dashboardNavItems: PermissionedNavItem[] = [
  {
    name: "Lead Management",
    href: "/lead-management",
    icon: Target,
    permissions: ["leads.view", "leads.manage", "quotations.view"],
  },
  {
    name: "Projects",
    href: "/projects",
    icon: Building2,
    permission: "projects.view", // single permission shorthand
  },
  {
    name: "Labour Management",
    href: "/labour-management",
    icon: HardHat,
    permissions: ["labour.view", "labour_type.view"],
  },
];
```

The dashboard layout calls `useFilteredNavItems(navItems)` which checks the user's effective permissions and returns only the items they can see.

> **Why not per-role folders?** In practice, most features are shared across roles with varying permission levels. Per-role folders create duplication. A super_admin and an admin visit the same `/projects` page — the permission system controls what actions are available, not the URL.

### Page & Layout Convention

```
(dashboard)/
├── config.ts          # Nav items (PermissionedNavItem[]), route constants — NO JSX, no hooks
├── layout.tsx         # Syncs auth → Zustand, renders DashboardShell, filters nav
├── loading.tsx        # Route-segment loading skeleton
└── <feature>/
    └── page.tsx       # "use client" — checks permission, renders domain component
```

### Route Constants

Never hardcode URL strings in components. Define them in `config.ts`:

```ts
export const ROUTES = {
  projects: "/projects",
  projectDetail: (id: string) => `/projects/${id}`,
  leadManagement: "/lead-management",
  labourManagement: "/labour-management",
  vendorManagement: "/vendor-management",
  // …
} as const;
```

Use these constants in navigation: `router.push(ROUTES.projectDetail(id))`.

### Protected Routes in Middleware

Middleware defines `PROTECTED_PREFIXES` (routes that require an `access_token` cookie) and handles:

1. **API proxy auth** — injects `Authorization: Bearer <token>` header for `/api/v1/*` requests.
2. **Route protection** — redirects to `/login?redirect=<original-path>` if no cookie.
3. **Auth route guard** — redirects already-logged-in users away from `/login`.

> **Rule:** When you add a new feature route, add its prefix to `PROTECTED_PREFIXES` in `proxy.ts`.

---

## 4. API Layer

### Architecture (Request Flow)

```
Component
     ↓ calls hook
Query Hook          (lib/<domain>/hooks.ts)
     ↓ calls service
Service Function    (lib/<domain>/api.ts)
     ↓ calls singleton
apiClient           (lib/api-client.ts)
     ↓ fetch with credentials
Middleware           (injects Bearer token from cookie)
     ↓
Backend API          (/api/v1/*)
```

**Every HTTP request goes through `apiClient`.** Components never call `fetch()` directly.

### The `apiClient` (`lib/api-client.ts`)

A singleton class (or module) wrapping `fetch`. Key behaviors:

- Always sends `credentials: 'include'` — cookies flow automatically.
- On **401**: attempts token refresh via `/api/auth/refresh` with **promise deduplication** (concurrent 401s share one refresh attempt), then **retries once**.
- On second **401**: redirects to `/login`.
- Handles **204 No Content** gracefully (returns `null`).
- **Flattens FastAPI 422 validation errors** — `[{ msg, loc }]` → human-readable `"field: message"` string.
- Throws a structured `AppError` for all non-OK responses — never a raw `Error`.
- Provides typed methods: `get<T>()`, `post<T>()`, `patch<T>()`, `put<T>()`, `delete()`, `upload<T>()` (FormData).
- Accepts an optional **`fetchOptions`** parameter to pass through framework-specific options.

```ts
import { apiClient } from "@/lib/api-client";

// apiClient returns data directly (not wrapped in { data })
const items = await apiClient.get<ResponseType>("/api/v1/items", {
  params: { page: "1" },
});
const lead = await apiClient.post<BackendLead>("/api/v1/leads", payload);
const updated = await apiClient.patch<BackendLead>(`/api/v1/leads/${id}`, changes);
await apiClient.delete(`/api/v1/leads/${id}`);

// FormData uploads (files, images)
const result = await apiClient.upload<UploadResponse>("/api/v1/files", formData);
```

### Singleton Safety on the Server

> **Security Warning:** In server-side environments (Node.js), a singleton `apiClient` is shared across **all incoming requests from all users**. If the singleton stores a user's Bearer token, cookie, or any per-user state as an instance property, **User B will make requests using User A's credentials.**

**The rule:** `apiClient` must be **stateless**. It should never hold per-user data in memory.

- **Safe:** `apiClient` delegates auth to middleware (middleware reads cookies per-request and injects `Authorization` headers). The `apiClient` itself knows nothing about tokens.
- **Safe:** `apiClient` accepts auth headers as function parameters, not stored state.
- **Unsafe:** `apiClient.setToken(token)` storing a token as a class property.
- **Unsafe:** A constructor that reads cookies at instantiation time.

**For server-side code (RSCs, Route Handlers, Server Actions)** that needs auth, use one of these approaches:

```ts
// Option 1: Per-request client factory (preferred for server-side)
import { cookies } from "next/headers";

function createServerClient() {
  const token = cookies().get("access_token")?.value;
  return {
    get: <T>(url: string) =>
      fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json() as Promise<T>),
  };
}

// Option 2: Pass auth as a parameter to the stateless singleton
await apiClient.get<T>("/api/v1/leads", {
  headers: { Authorization: `Bearer ${token}` },
});
```

**Summary:** On the client → use the singleton (middleware handles auth). On the server → either use a per-request factory or pass auth explicitly. Never store tokens in the singleton.

### Domain Service (`lib/<domain>/api.ts`)

Each domain wraps `apiClient` and applies transformations. Service functions **always return frontend types** — never raw backend shapes:

```ts
// lib/leads/api.ts
import { apiClient } from "@/lib/api-client";
import { transformLead, transformLeadList } from "./transformers";
import type {
  BackendLead,
  BackendLeadListResponse,
  Lead,
  LeadFormValues,
  LeadListParams,
  LeadListResult,
} from "./types";

export async function fetchLeads(params: LeadListParams = {}): Promise<LeadListResult> {
  const queryParams: Record<string, string> = {};
  if (params.skip !== undefined) queryParams.skip = String(params.skip);
  if (params.limit !== undefined) queryParams.limit = String(params.limit);
  if (params.status) queryParams.status = params.status;
  if (params.search) queryParams.search = params.search;

  const data = await apiClient.get<BackendLeadListResponse>("/api/v1/leads", {
    params: queryParams,
  });
  return transformLeadList(data); // ← transform at the boundary
}

export async function createLead(values: LeadFormValues): Promise<Lead> {
  // Build snake_case payload from camelCase form values
  const payload = {
    project_name: values.projectName,
    phone: values.phone || undefined,
    email: values.email || undefined,
    // …field mapping
  };
  const data = await apiClient.post<BackendLead>("/api/v1/leads", payload);
  return transformLead(data);
}
```

> **Recommendation:** For domains with many fields, extract the camelCase → snake_case mapping into a `toBackendLead()` function in `transformers.ts` to reduce duplication between `createLead` and `updateLead`.

### Domain Types (`lib/<domain>/types.ts`)

Keep backend shapes, frontend shapes, Zod schemas, and domain constants in the **same file**, separated by clear sections:

```ts
// lib/leads/types.ts

import { z } from "zod";

// ── Constants ────────────────────────────────────────────────
export const LEAD_STATUSES = ["new", "contacted", "qualified", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  lost: "Lost",
};

export const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  contacted: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  // …
};

export const PAGE_SIZE = 20;

// ── Backend shapes (match wire format exactly) ──────────────
export interface BackendLead {
  id: string;
  lead_name: string;
  created_at: string;
  assigned_user_id: string | null;
}

export interface BackendLeadListResponse {
  items: BackendLead[];
  total: number;
  skip: number;
  limit: number;
}

// ── Frontend shapes (used in components) ────────────────────
export interface Lead {
  id: string;
  leadName: string;
  createdAt: string;
  assignedUserId: string | null;
}

export interface LeadListResult {
  items: Lead[];
  total: number;
}

// ── Query/mutation parameter types ──────────────────────────
export interface LeadListParams {
  skip?: number;
  limit?: number;
  status?: string;
  search?: string;
}

// ── Zod schemas (form validation) ────────────────────────────
export const leadFormSchema = z.object({
  projectName: z.string().min(1, "Project name is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
});

export type LeadFormValues = z.infer<typeof leadFormSchema>;
```

> **Pattern:** `as const` arrays derive union types, then parallel `Record<Status, string>` maps for labels and Tailwind color classes. This eliminates magic strings in components.

**Naming rule:** Backend types use `Backend*` prefix and `snake_case` fields. Frontend types use no prefix and `camelCase` fields.

### Domain Transformers (`lib/<domain>/transformers.ts`)

All `snake_case` → `camelCase` conversions live here. This is the **only** place where backend field names appear:

```ts
// lib/leads/transformers.ts
import type { BackendLead, Lead } from "./types";

export function transformLead(raw: BackendLead): Lead {
  return {
    id: raw.id,
    leadName: raw.lead_name,
    createdAt: raw.created_at,
    assignedUserId: raw.assigned_user_id,
  };
}

// Reverse transformer for mutations (frontend → backend)
export function toBackendLead(lead: Partial<Lead>): Record<string, unknown> {
  return {
    lead_name: lead.leadName,
    assigned_user_id: lead.assignedUserId,
  };
}
```

> **Rule:** Transform at the service boundary (in `api.ts`). Components and query hooks **never** see `snake_case` fields.

### Domain Barrel (`lib/<domain>/index.ts`)

Export only what the rest of the app needs:

```ts
// lib/leads/index.ts
export { fetchLeads, createLead, updateLead, deleteLead } from "./api";
export { useLeads, useLead, useCreateLead } from "./hooks";
export type { Lead, FetchLeadsParams } from "./types";
```

### Next.js Fetch Compatibility

> **Important if using Next.js App Router:** Next.js heavily patches the native `fetch` API to support granular caching (`force-cache`, `revalidate`), server-side request deduplication, and static generation. Your `apiClient` must not fight this.

**Rules for Next.js compatibility:**

- The `apiClient` should accept an optional `fetchOptions` bag that gets spread into the underlying `fetch()` call. This allows service functions to pass through Next.js-specific options like `{ next: { revalidate: 60 } }` or `{ cache: 'no-store' }`.
- On the **server** (inside RSCs or Server Actions), use native `fetch` with Next.js options directly when you need framework caching. The `apiClient` singleton is primarily for **client-side** requests.
- Never instantiate `apiClient` at module scope with hardcoded headers that prevent Next.js from deduplicating requests on the server.

```ts
// In a service function that may be called from an RSC:
export async function fetchLeads(
  params: FetchLeadsParams,
): Promise<LeadListResult> {
  const { data } = await apiClient.get<BackendLeadListResponse>(
    "/api/v1/leads",
    { page: String(params.page ?? 1) },
    { next: { revalidate: 60 } }, // ← passed through to fetch()
  );
  return { items: data.items.map(transformLead), total: data.total };
}
```

---

## 5. Server Components & Server Actions

> **This section applies to frameworks with server rendering capabilities** (Next.js App Router, Nuxt 3, SvelteKit). If your framework is fully client-rendered (Vite + React SPA), skip this section — all data fetching goes through React Query on the client.

### The Key Distinction

Modern frameworks introduce **Server Components** (RSCs in React/Next.js) that run on the server and ship **zero JavaScript** to the client. They are designed for **initial data loading**, not interactive state.

| Scenario                                                           | Use                                       | Why                                                           |
| ------------------------------------------------------------------ | ----------------------------------------- | ------------------------------------------------------------- |
| Page first-load data (dashboard overview, profile, static lists)   | **Server Component** with `async/await`   | No JS shipped, faster TTFB, SEO-friendly                      |
| Interactive, paginated data (tables with sorting, search, filters) | **Client Component** with React Query     | Needs client-side cache, background refetch, pagination state |
| Form submissions / write operations                                | **Server Action** or React Query mutation | Both valid — see decision guide below                         |
| Real-time or polling data                                          | **Client Component** with React Query     | Needs `refetchInterval`, WebSocket integration                |
| Data shared across many client components                          | **Client Component** with React Query     | Needs shared cache accessible from multiple components        |

### Server Component Data Fetching

For initial page loads, fetch data directly in the Server Component. No hooks, no `"use client"`, no React Query:

```tsx
// app/(dashboard)/admin/page.tsx — this is a Server Component by default
import { fetchDashboardStats } from "@/lib/dashboard/api";

export default async function AdminOverview() {
  const stats = await fetchDashboardStats(); // runs on server, no JS shipped

  return (
    <div>
      <h1>Dashboard</h1>
      <StatsDisplay stats={stats} /> {/* can be a Server Component too */}
      <InteractiveLeadTable /> {/* "use client" — uses React Query */}
    </div>
  );
}
```

### Server → Client Hydration Pattern (Eliminating Loading Spinners)

The biggest user-facing performance win: **fetch data on the server, pass it to a client component as `initialData`, and let React Query take over for subsequent interactions.** This eliminates the initial loading spinner entirely.

```tsx
// app/(dashboard)/admin/leads/page.tsx — Server Component
import { fetchLeads } from "@/lib/leads/api";
import { LeadTable } from "./lead-table"; // "use client" component

export default async function LeadsPage() {
  // Fetched on the server — no spinner, HTML arrives with data
  const initialData = await fetchLeads({ page: 1, limit: 50 });

  return <LeadTable initialData={initialData} />;
}
```

```tsx
// app/(dashboard)/admin/leads/lead-table.tsx — Client Component
"use client";
import { useLeads } from "@/lib/leads";
import type { LeadListResult, FetchLeadsParams } from "@/lib/leads";

export function LeadTable({ initialData }: { initialData: LeadListResult }) {
  const [params, setParams] = useState<FetchLeadsParams>({ page: 1 });

  const { data, isLoading } = useLeads(params, {
    initialData: params.page === 1 ? initialData : undefined,
    // React Query uses server data for page 1 — no loading spinner
    // Subsequent pages/filters fetch client-side as normal
  });

  return (
    <DataTable
      data={data?.items ?? []}
      isLoading={isLoading}
      onPageChange={(page) => setParams((p) => ({ ...p, page }))}
    />
  );
}
```

**Why this is optimal:**

| Approach                      | Initial load                                         | Navigation                           | Complexity  |
| ----------------------------- | ---------------------------------------------------- | ------------------------------------ | ----------- |
| Client-only (React Query)     | Spinner → download JS → parse → API call → render | Instant (cached)                  | Simple   |
| Server-only (RSC)             | HTML arrives with data                            | Full page reload for interactions | Simple   |
| **Server + Client hydration** | **HTML arrives with data**                        | **Instant (React Query cache)**   | Moderate |

**Use the hydration pattern for:** Any page that has both an initial data load AND interactive features (sorting, pagination, filtering). This is the majority of dashboard pages.

**Skip it for:** Purely static pages (About, Settings) — just use a Server Component. Purely interactive components with no meaningful first-load (modals, search dropdowns) — just use React Query.

### Server Actions for Mutations

Server Actions can replace React Query mutations for simple form submissions. They run on the server, have direct access to cookies, and integrate with Next.js revalidation:

```ts
// lib/leads/actions.ts
"use server";

import { revalidatePath } from "next/cache";

export async function createLeadAction(formData: FormData) {
  const response = await fetch(`${process.env.API_URL}/api/v1/leads`, {
    method: "POST",
    body: JSON.stringify(Object.fromEntries(formData)),
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) throw new Error("Failed to create lead");

  revalidatePath("/admin/leads"); // ← automatically refreshes the page data
}
```

### When to Use Server Actions vs React Query Mutations

```
Does the mutation need optimistic UI updates?
├─ YES → React Query mutation (onMutate + rollback)
└─ NO → Does it need to update React Query cache across components?
         ├─ YES → React Query mutation (queryClient.invalidateQueries)
         └─ NO → Server Action (simpler, runs on server, revalidatePath)
```

**Practical guidance:**

- **Server Actions** work best for: simple forms, admin CRUD, settings updates — anything where a page refresh/revalidation is acceptable.
- **React Query mutations** work best for: interactive UIs where the user expects instant feedback (optimistic updates), or when multiple components need to react to the mutation.
- **Don't mix both for the same operation.** Pick one pattern per mutation.

---

## 6. State Management

> **This is the most critical architectural decision.** Get this wrong and the codebase becomes unmaintainable. Split state into two categories based on its **origin** — never mix them.

### The Two-Bucket Rule

| Bucket              | Tool              | What belongs here                                                                  |
| ------------------- | ----------------- | ---------------------------------------------------------------------------------- |
| **Server state**    | React Query / SWR | Anything from the API: lists, records, counts, stats, paginated results            |
| **Client/UI state** | Zustand / Pinia   | Auth session, modal open/close, selected tab, sidebar collapsed, local form drafts |

> **Important:** Use `useState` for component-local UI state (opening/closing a tab). Use Zustand/Pinia only if **multiple unrelated components** need to share that state.

### Server State — React Query Hooks (`lib/<domain>/hooks.ts`)

```ts
// lib/leads/hooks.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useBlockingMutation } from "@/lib/loading";
import { AppError } from "@/types";
import * as leadApi from "./api";
import type { LeadListParams, LeadFormValues, LeadStatus } from "./types";

// Query key factory — always arrays, never plain strings
// Separate key factories for sub-resources within a domain
export const leadKeys = {
  all: ["leads"] as const,
  analytics: () => [...leadKeys.all, "analytics"] as const,
  lists: () => [...leadKeys.all, "list"] as const,
  list: (params: LeadListParams) => [...leadKeys.lists(), params] as const,
  detail: (id: string) => [...leadKeys.all, "detail", id] as const,
};

// Sub-resource key factories (e.g., quotations under leads)
export const quotationKeys = {
  all: ["quotations"] as const,
  lists: () => [...quotationKeys.all, "list"] as const,
  list: (params: QuotationListParams) => [...quotationKeys.lists(), params] as const,
  detail: (id: string) => [...quotationKeys.all, "detail", id] as const,
};

// Centralized error handler for toast notifications
function handleError(err: unknown) {
  const message =
    err instanceof AppError ? err.message : "An unexpected error occurred";
  toast.error(message);
}

export function useLeads(params: LeadListParams = {}) {
  return useQuery({
    queryKey: leadKeys.list(params),
    queryFn: () => leadApi.fetchLeads(params),
    placeholderData: (previousData) => previousData, // keep old data during pagination
    staleTime: 30_000, // 30s — adjust per domain
  });
}

// Mutations use useBlockingMutation for global loading overlay
export function useCreateLead() {
  const queryClient = useQueryClient();
  return useBlockingMutation(
    {
      mutationFn: async (values: LeadFormValues) => {
        const result = await leadApi.createLead(values);
        await queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
        await queryClient.invalidateQueries({ queryKey: leadKeys.analytics() });
        return result;
      },
      onSuccess: () => toast.success("Lead created"),
      onError: handleError,
    },
    { source: "mutation", label: "Creating lead" },
  );
}
}
```

**React Query rules:**

- Use a **query key factory** per domain — predictable invalidation, no typos.
- Use separate key factories for **sub-resources** within a domain (e.g., `leadKeys`, `quotationKeys`, `dealKeys`).
- Set `staleTime` deliberately — `0` causes waterfall refetches on every mount.
- Use `placeholderData: (prev) => prev` for **list queries** to keep old data visible during pagination (replaces deprecated `keepPreviousData`).
- Use **`useBlockingMutation`** (wraps `useMutation` with global loading overlay tracking) instead of raw `useMutation`.
- Use **centralized `handleError`** function in hooks.ts for consistent toast error handling.
- Use the `enabled` option for conditional queries (e.g., only fetch when ID is present).
- Prefer **optimistic updates** for mutations that update visible list items.
- Never duplicate fetched data into a client store.

### Client State — Zustand Stores (`lib/<domain>/store.ts`)

Reserved **only** for state with no server equivalent. In practice, the most common use is **modal/form state management** \u2014 tracking which entity is being viewed/edited and which modals are open:

```ts
// lib/leads/store.ts
import { create } from "zustand";
import type { Lead, Quotation, LeadStatus } from "./types";

type LeadTab = "leads" | "quotations" | "design-quotations" | "deals";

interface LeadUIState {
  // ── Tab & view ──────────────────
  activeTab: LeadTab;
  setActiveTab: (tab: LeadTab) => void;
  viewMode: "table" | "card";
  setViewMode: (mode: "table" | "card") => void;

  // ── Lead modal ──────────────────
  isLeadOpen: boolean;
  editingLead: Lead | null;
  isLeadViewMode: boolean;
  openLeadView: (lead: Lead) => void;
  openLeadForm: (lead?: Lead) => void;
  closeLeadForm: () => void;

  // ── Delete confirmation ─────────
  deletingLead: Lead | null;
  openDeleteLead: (lead: Lead) => void;
  closeDeleteLead: () => void;

  // ── Filters ─────────────────────
  statusFilter: LeadStatus | "";
  setStatusFilter: (status: LeadStatus | "") => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const useLeadStore = create<LeadUIState>((set) => ({
  activeTab: "leads",
  setActiveTab: (activeTab) => set({ activeTab }),
  viewMode: "table",
  setViewMode: (viewMode) => set({ viewMode }),

  isLeadOpen: false,
  editingLead: null,
  isLeadViewMode: false,
  openLeadView: (lead) =>
    set({ isLeadOpen: true, editingLead: lead, isLeadViewMode: true }),
  openLeadForm: (lead) =>
    set({ isLeadOpen: true, editingLead: lead ?? null, isLeadViewMode: false }),
  closeLeadForm: () =>
    set({ isLeadOpen: false, editingLead: null, isLeadViewMode: false }),

  deletingLead: null,
  openDeleteLead: (lead) => set({ deletingLead: lead }),
  closeDeleteLead: () => set({ deletingLead: null }),

  statusFilter: "",
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  searchQuery: "",
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));
```

> **Pattern:** Each modal in the store follows a triplet: `isOpen` boolean, `editing<Entity>` for the data, `isViewMode` boolean. Open/close functions set all three atomically.

**Client store rules:**

- Select granularly: `useStore((s) => s.specificValue)` — never subscribe to the whole store.
- **Never** put `isLoading`, `error`, `items[]`, or `fetchX()` methods in a client store.
- Keep stores small (< 50 lines). One store per domain, only if needed.
- Most UI state belongs in `useState` — Zustand is for **cross-component shared** state only.

### The Anti-Pattern to Avoid (Critical)

```ts
// WRONG — This is re-implementing React Query inside Zustand
export const useLeadStore = create((set) => ({
  leads: [],
  isLoading: false,
  error: null,
  pagination: { page: 1, limit: 50 },
  fetchLeads: async (params) => {
    set({ isLoading: true });
    try {
      const data = await leadService.fetchLeads(params);
      set({ leads: data.items, isLoading: false });
    } catch (err) {
      set({ error: err, isLoading: false });
    }
  },
}));
```

**Why this is wrong:** No caching, no background refetching, no stale-while-revalidate, manual loading/error flags, race conditions on rapid navigation, duplicate requests on remount, no retry logic. This pattern creates **every problem** that React Query was designed to solve.

### Decision Flowchart

```
Does this data come from an API?
├─ YES → Is it initial page load data with no client interactivity?
│        ├─ YES → Fetch in a Server Component (RSC) — no JS shipped
│        └─ NO  → Use React Query (client-side server state)
└─ NO → Does it need to be shared across unrelated components?
         ├─ YES → Use Zustand (client state)
         └─ NO → Use useState (local component state)
```

---

## 7. Component Architecture

### Directory Roles

| Directory               | Purpose                                               | Example contents                                  |
| ----------------------- | ----------------------------------------------------- | ------------------------------------------------- |
| `components/<domain>/`  | Domain-specific UI — forms, lists, detail views       | `lead-list.tsx`, `lead-form.tsx`, `lead-view-details.tsx` |
| `components/layout/`    | Shell layout — sidebar, top nav, mobile dock          | `DashboardShell`, `MobileDockNav`                 |
| `components/loading/`   | Loading overlays and route-loading indicators         | `GlobalLoadingOverlay`, `FullscreenLoader`        |
| `components/providers/` | Context wrappers — no visual output                   | `QueryProvider`, `ThemeProvider`                  |
| `components/shared/`    | Truly cross-domain reusable components                | `SvgIcon`                                         |
| `components/ui/`        | Low-level primitives — no business logic              | `Modal`, `Tabs`, `BulkActionBar`, `ViewToggle`    |
| `hooks/`                | App-wide custom hooks (not tied to one domain)        | `useMediaQuery`, `useDebounce`                    |

### File & Folder Conventions

- **One component per folder**, folder name in `kebab-case`.
- Main component file is `index.tsx`.
- Colocate sub-components, hooks, and helpers in the same folder.
- If a sub-component is only used within its parent, do **not** export it from `shared/`.

```
shared/
└── data-table/
    ├── index.tsx          # export const DataTable = ...
    ├── table-header.tsx   # sub-component, not exported from shared/
    ├── table-row.tsx      # sub-component
    └── use-sorting.ts     # local hook
```

### Import Shared Components via the Barrel

```ts
// Correct
import { DataTable, StatsCard, SlideOver } from "@/components/shared";

// Wrong — bypasses the barrel
import { DataTable } from "@/components/shared/data-table";
```

### Barrel File Performance Note

> **Caveat:** In large projects, a single massive barrel file (`index.ts` re-exporting 30+ components) can hurt **HMR speed** and **tree-shaking** in bundlers like Webpack. Importing one component evaluates the entire barrel, pulling in all dependencies.

**Mitigation strategies (apply as the project grows):**

1. **Next.js `optimizePackageImports`** — Add `components/shared` to the `optimizePackageImports` array in `next.config.ts`. This tells Next.js to transform barrel imports into direct imports at build time.
2. **Domain-scoped barrels** — Instead of one giant `shared/index.ts`, group into smaller barrels: `shared/tables/index.ts`, `shared/overlays/index.ts`, etc.
3. **Direct imports as escape hatch** — If profiling shows a specific barrel causing slow HMR, bypass it with a direct import and add a comment explaining why.

```ts
// next.config.ts
module.exports = {
  experimental: {
    optimizePackageImports: ["@/components/shared", "lucide-react"],
  },
};
```

**Rule of thumb:** Start with a single barrel. When the barrel exceeds ~20 re-exports or HMR becomes noticeably slow, split into domain-scoped barrels.

### `DashboardShell`

The dashboard `layout.tsx` renders `<DashboardShell>`, which provides:

- Collapsible sidebar (88px collapsed, 250px expanded, resizable on desktop)
- Mobile dock navigation (bottom bar with primary items + "More" modal)
- Context hook exposing shell state (`isCollapsed`, etc.)
- Configurable module title, badge styles, user profile slot
- Session timer with flip-digit animation
- Drag-to-reorder nav items (persisted to sessionStorage)

```tsx
// (dashboard)/layout.tsx
<DashboardShell
  navItems={navItems}       // filtered by permissions
  basePath="/"
  moduleTitle="PS Construction"
  mobileTitle="PS Construction"
  userProfile={<UserProfile />}
>
  {children}
</DashboardShell>
```

### Component Sizing Guidelines

| Component type   | Max lines | If exceeded                                            |
| ---------------- | --------- | ------------------------------------------------------ |
| Page component   | ~200      | Extract sub-components or custom hooks                 |
| Shared component | ~150      | Extract sub-components into the same folder            |
| Custom hook      | ~80       | Split into smaller hooks                               |
| Zustand store    | ~50       | You're probably storing server state — use React Query |

---

## 8. Authentication & Authorization

### Cookie-Based Auth (BFF Pattern)

Authentication uses a **Backend-for-Frontend (BFF)** pattern with **HTTP-only cookies**. JavaScript never reads raw token values — this is intentional for XSS protection.

**BFF Route Handlers** (`app/api/auth/`):

| Route                  | Method | Purpose                                                                 |
| ---------------------- | ------ | ----------------------------------------------------------------------- |
| `/api/auth/login`      | POST   | Proxies OAuth2 to backend, sets httpOnly cookies (access: 2hr, refresh: 7d) |
| `/api/auth/me`         | GET    | Returns current user, silently refreshes if token expired               |
| `/api/auth/refresh`    | POST   | Rotates tokens via refresh cookie, sets new cookies                     |
| `/api/auth/logout`     | POST   | Clears cookies                                                          |

### Request Flow

```
Browser Request
     ↓
proxy.ts
├── /api/v1/* → injects Authorization: Bearer <token> from cookie
└── /<protected-route> → redirects to /login?redirect=<path> if no cookie
     ↓
Route Handler (/app/api/auth/*) ← BFF layer, manages cookies
     ↓
Backend API
```

### `proxy.ts`

- Defines `PROTECTED_PREFIXES` — routes requiring authentication.
- Defines `AUTH_ROUTES` — routes only for unauthenticated users.
- For API proxy calls (`/api/v1/*`), reads the cookie and injects `Authorization` header — **no manual token management anywhere else**.
- Defines `DEFAULT_DASHBOARD` for post-login redirect (all roles share the same landing page).

### Auth Domain (`lib/auth/`)

Auth follows the standard domain pattern with an extra hook:

| File                  | Purpose                                                       |
| --------------------- | ------------------------------------------------------------- |
| `types.ts`            | `BackendUser` (snake_case) + `AuthUser` (camelCase)           |
| `transformers.ts`     | `transformUser()`, `extractRole()` (checks superuser flag)    |
| `api.ts`              | `fetchMe()`, `login()`, `logout()` — calls BFF routes        |
| `hooks.ts`            | `useMe()` query, `useLogout()` mutation                       |
| `store.ts`            | `useAuthStore` — holds `user`, `setUser`, `clearUser`         |
| `use-session-timer.ts`| Session countdown timer (displayed in sidebar)                |

**Why auth user is in Zustand:** The current user object is **session state** — it's set once on login and read by many components. It's not paginated, filtered, or refetched in the same way as domain data. The dashboard layout syncs `useMe()` query data → Zustand on mount:

```tsx
// (dashboard)/layout.tsx
const { data: user } = useMe();
useEffect(() => {
  if (user) {
    setUser(user);                                // auth store
    setRole(user.role);                           // role store
    setIsSuperuser(user.isSuperuser);             // role store
    setEffectivePermissions(user.effectivePermissions); // role store
  }
}, [user]);
```

### Permission System (`lib/permissions/`)

A full RBAC (Role-Based Access Control) system:

| File          | Purpose                                                   |
| ------------- | --------------------------------------------------------- |
| `config.ts`   | `ROLE_PERMISSIONS` map, `ROLES` metadata, `ROLE_DASHBOARD_MAP` |
| `types.ts`    | `BuiltinUserRole`, `UserRole`, `Permission` (~80 keys), `PermissionedNavItem` |
| `helpers.ts`  | `hasPermission()`, `hasAnyPermission()`, `hasAllPermissions()`, `getNavItemsForRole()` |
| `hooks.ts`    | `usePermission(perm)`, `useAnyPermission(perms)`, `useFilteredNavItems(items)` |
| `store.ts`    | `useRoleStore` — `role`, `isSuperuser`, `effectivePermissions: Set<string>` |

**5 Built-in Roles:**

| Role              | Access Level                                             |
| ----------------- | -------------------------------------------------------- |
| `super_admin`     | Full access — `hasPermission` always returns `true`      |
| `admin`           | Full operational (same as super_admin for most features)  |
| `site_supervisor` | Field-level: projects, labour, site reports               |
| `estimator`       | Estimation & costing, read-only projects                  |
| `client`          | Read-only: own projects, documents, invoices              |

**Permission format:** `resource.action` (e.g., `labour.manage`, `projects.view`, `incidents.delete`).

**Permission check flow:** `super_admin` → always true → effective permissions (Set lookup) → fallback deny.

**Frontend ↔ Backend mapping:** `PERMISSION_MAPPING` in `helpers.ts` translates frontend keys (e.g., `"labour.manage"`) to backend permission names (e.g., `["labours:create", "labours:update"]`).

**Usage in components:**

```tsx
// Guard a button
const canManage = usePermission("leads.manage");
{canManage && <button onClick={handleEdit}>Edit</button>}

// Guard an entire tab
const PROJECT_DETAIL_TABS: PermissionedTab[] = [
  { key: "labour", label: "Labour", icon: HardHat, permission: "labour.view" },
  { key: "materials", label: "Material", icon: Boxes, permission: "material.view" },
  // …
];

// Filter nav items in layout
const navItems = useFilteredNavItems(dashboardNavItems);
```

### Access Control Admin Panel (`lib/access-control/`)

For **runtime role/permission management** (admin UI to create roles, assign permissions):

- `api.ts` — CRUD for roles and permissions (`/api/v1/users/meta/*`)
- `hooks.ts` — `useAllRoles()`, `useAllPermissions()`, `useCreateRole()`, `useUpdateRolePermissions()`
- `types.ts` — `RoleWithPermissions`, `PermissionGroup`, `PermissionRecord`
- `transformers.ts` — `groupPermissionsByResource()` for admin grid display

---

## 9. Styling & Design Tokens

### Tailwind v4 — CSS-Native Configuration

Tailwind v4 uses a **CSS-native** engine — no `tailwind.config.js/ts` file. Configuration is done via PostCSS and design tokens live in `globals.css`.

```
postcss.config.mjs → { plugins: { "@tailwindcss/postcss": {} } }
```

### `globals.css` — Single Source of Truth

All design tokens are defined **once** in `globals.css`:

```css
@import "tailwindcss";

:root {
  --background: #fdfaf6;            /* warm white */
  --foreground: #2a2420;
  --primary: #d97757;               /* clay orange */
  --border: #ebdcd0;                /* soft warm */
  --sidebar: #efdfd1;
  --radius: 1.25rem;                /* bubbly, consistent */
}

.dark {
  --background: #1c1a19;            /* warm dark brown */
  --primary: #e88d6f;               /* lighter clay */
  --sidebar: #2b2725;
}
```

> **Rule:** If you're about to write a hex value, `rgba()`, or `style={{ color: '#...' }}` — stop. Either use an existing token, or add a new named token to `globals.css` first.

### Use Semantic Tokens

```
  text-foreground       bg-background
  text-muted-foreground bg-muted
  text-primary          bg-primary/10
  border-border         bg-destructive

  text-gray-700         bg-[#f5f5f5]
  border-gray-200       text-[#333]
```

### Typography

Fonts are loaded **once** in the root layout and exposed as CSS variables. Never import a font in a component file.

### Animations

- Keep animations subtle (< 300ms).
- Use `layout` transitions for DOM changes.
- Never animate colors with JavaScript — use CSS transitions.
- Use a consistent animation library (Framer Motion, Auto Animate, CSS transitions).

---

## 10. TypeScript Conventions

### Type Location

| Location                | Naming            | Case         | Purpose                         |
| ----------------------- | ----------------- | ------------ | ------------------------------- |
| `lib/<domain>/types.ts` | `Backend*` prefix | `snake_case` | Wire types from the backend     |
| `lib/<domain>/types.ts` | No prefix         | `camelCase`  | Frontend domain types (UI-side) |
| `src/types/`            | Varies            | `camelCase`  | Global enums, shared interfaces |

### Rules

- **No `any`** — if genuinely unavoidable, add an `eslint-disable` with an explaining comment.
- Type all function parameters and return types explicitly.
- Use `export type` for pure type-only exports.
- Use **`@/` path aliases** for all imports — no relative paths beyond one level (`../`).

```ts
// Aliases everywhere
import { useLeadUIStore } from "@/lib/leads";
import { DataTable } from "@/components/shared";
import { cn } from "@/lib/utils";

// Deep relative paths
import { cn } from "../../../lib/utils";
```

### Enum vs Union Type

Prefer string union types for small sets. Use enums only when the backend sends matching values and they're used across many files:

```ts
// For small, fixed sets
type Priority = "LOW" | "MEDIUM" | "HIGH";

// For backend-matching enums used across many files
enum LeadStatus {
  NEW = "NEW",
  WARM = "WARM",
  HOT = "HOT",
  CLOSED = "CLOSED",
}
```

---

## 11. Error Handling

### `AppError` Class

All API errors thrown by the HTTP client are instances of `AppError`:

```ts
class AppError extends Error {
  message: string; // Human-readable — show to user
  statusCode: number; // HTTP status (400, 401, 403, 422, 500…)
  detail: unknown; // Backend's structured detail — use for field-level errors
  data: unknown; // Full raw response body
}
```

### Error Handling in Mutations

```ts
useMutation({
  mutationFn: createLead,
  onError: (err) => {
    if (!(err instanceof AppError)) throw err;

    // 1. Always show the top-level message
    toast.error(err.message);

    // 2. For 422 validation errors — map to form fields
    if (err.statusCode === 422 && Array.isArray(err.detail)) {
      err.detail.forEach((issue: { loc: string[]; msg: string }) => {
        const field = issue.loc.at(-1);
        if (field) form.setError(field, { message: issue.msg });
      });
    }
  },
});
```

### Error Handling Rules

- **Never silently swallow errors** — always show a toast or field-level message.
- **Show `err.detail` when actionable** — don't show only "Something went wrong" when the backend gives you field-level errors.
- For form submissions: map `422` errors to individual input fields.
- For mutations: use the server-state library's error callback (`onError`), not try/catch in the component.
- `<ErrorBoundary>` wraps the app tree for unhandled **render** errors — async errors are handled by the query library.

### Error Boundary

Every app should have a root `<ErrorBoundary>` that:

- Catches unhandled render errors
- Shows a user-friendly fallback UI
- Provides a "retry" action
- Logs errors to a monitoring service (Sentry, LogRocket, etc.) in production

---

## 12. Form Handling

### Recommended Approach

Use a form library (React Hook Form, Formik, VeeValidate) with schema validation (Zod, Yup):

```ts
// lib/leads/types.ts — schemas colocated with types, not in separate files
import { z } from "zod";

export const leadFormSchema = z.object({
  projectName: z.string().min(1, "Project name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().min(10, "Phone must be at least 10 digits").optional(),
  sites: z.array(z.string()).optional(),
});

export type LeadFormValues = z.infer<typeof leadFormSchema>;
```

### Form Rules

- Define validation schemas in `types.ts` alongside domain types — **not** in a separate `schemas.ts` file.
- Use the schema as the single source of truth for both frontend validation and TypeScript types (`z.infer<typeof schema>`).
- Map backend `422` errors to form field errors (see Error Handling section).
- Keep form state local — forms don't belong in Zustand.
- Separate form submission logic into mutation hooks.
- Use `CreatableCombobox` for fields where users can add new options (e.g., sites).

---

## 13. Performance

### Lazy Loading

Heavy interactive components (tables, charts, editors) should be lazy-loaded:

```ts
// components/shared/lazy.tsx
import dynamic from "next/dynamic";

export const LazyDataTable = dynamic(() => import("./data-table"), {
  ssr: false,
  loading: () => <div className="h-64 w-full animate-pulse rounded-2xl bg-muted/20" />,
});
```

**Rules:**

- All lazy imports use `ssr: false` for browser-only components.
- Every lazy import defines a **skeleton fallback** — never a blank space.
- Register all heavy components in a central `shared/lazy.tsx` file.

### General Performance Rules

- Use the query library's `staleTime` to avoid unnecessary refetches.
- Use `React.memo` sparingly — only when profiling shows a re-render problem.
- Virtualize long lists (> 100 rows) with `@tanstack/react-virtual` or equivalent.
- Images use the framework's image component (or `<img>` with explicit `width` / `height`).
- Avoid barrel re-exports that pull in the entire domain — export only what's needed.
- Use `Suspense` boundaries to show loading states for lazy components.
- Debounce search inputs (300ms+) to avoid excessive API calls.

---

## 14. Testing Strategy

### Test Pyramid

| Layer                 | Tool                  | What to test                                                  |
| --------------------- | --------------------- | ------------------------------------------------------------- |
| **Unit tests**        | Vitest / Jest         | Transformers, utility functions, query key factories, schemas |
| **Component tests**   | Testing Library       | Shared components render correctly, handle props, fire events |
| **Integration tests** | Testing Library + MSW | Hooks + components working together with mocked API responses |
| **E2E tests**         | Playwright / Cypress  | Critical user flows (login, create lead, navigation)          |

### What to Test Per Domain

For each domain folder (`lib/<domain>/`), test:

1. **Transformers** — `transformLead(backendData)` returns correct frontend shape.
2. **Query hooks** — Using MSW to mock API, verify correct key structure and data flow.
3. **Schemas** — Valid data passes, invalid data fails with correct error messages.

### What NOT to Test

- Don't test implementation details (internal state of React Query cache).
- Don't test third-party library behavior.
- Don't write tests that break when styling changes.
- Don't test `apiClient` internals — test the domain hooks that use it.

---

## 15. Module Configuration Pattern

The dashboard folder has a single `config.ts` file shared by all roles:

```ts
// (dashboard)/config.ts
import { Target, Building2, HardHat, Users, Fingerprint } from "lucide-react";
import type { PermissionedNavItem } from "@/lib/permissions";

// 1. Nav items — consumed by DashboardShell, filtered by permissions
export const dashboardNavItems: PermissionedNavItem[] = [
  {
    name: "Lead Management",
    href: "/lead-management",
    icon: Target,
    permissions: ["leads.view", "leads.manage", "quotations.view"],
  },
  {
    name: "Projects",
    href: "/projects",
    icon: Building2,
    permission: "projects.view",  // single permission shorthand
  },
  {
    name: "Users",
    href: "/user-management",
    icon: Users,
    permissions: ["users.manage", "users.delete"],
  },
  {
    name: "Access Control",
    href: "/access-control",
    icon: Fingerprint,
    permission: "roles.manage",
  },
];

// 2. Route constants — never hardcode URL strings in components
export const ROUTES = {
  projects: "/projects",
  projectDetail: (id: string) => `/projects/${id}`,
  leadManagement: "/lead-management",
  labourManagement: "/labour-management",
  // …
} as const;
```

**Rules:**

- `config.ts` contains **zero** JSX and **zero** hooks — it's pure data.
- Nav items declare `permission` (single) or `permissions` (array) — the layout filters via `useFilteredNavItems()`.
- Import route strings from `ROUTES` constants — never inline `/projects` in a component.
- Use functions for dynamic routes: `ROUTES.projectDetail(id)`, not string interpolation.
- **Dynamic badges** are computed in `layout.tsx` by mapping over nav items (e.g., add pending count badge to Users nav item).

---

## 16. Provider Composition

The root layout stacks all global providers in a specific order:

```tsx
// app/layout.tsx
<QueryProvider>                    {/* TanStack React Query cache */}
  <ThemeProvider                   {/* next-themes (light/dark + system) */}
    attribute="class"
    defaultTheme="light"
    enableSystem
    disableTransitionOnChange
  >
    {children}
    <Suspense fallback={null}>
      <RouteLoadingObserver />     {/* Tracks route transitions */}
    </Suspense>
    <GlobalLoadingOverlay />       {/* Blocking loading overlay for mutations */}
    <Toaster richColors position="top-right" />
  </ThemeProvider>
</QueryProvider>
```

**Current stack:**

| Layer                    | Provider              | Purpose                                           |
| ------------------------ | --------------------- | ------------------------------------------------- |
| 1 (outermost)            | `QueryProvider`       | React Query cache + defaults                      |
| 2                        | `ThemeProvider`       | Dark mode, light mode, system preference          |
| 3                        | `RouteLoadingObserver`| Tracks Next.js route transitions via loading store |
| 4                        | `GlobalLoadingOverlay`| Shows blocking overlay during mutations/uploads   |
| 5 (innermost)            | `Toaster`            | Sonner toast notifications                        |

> **Recommendation:** Add a root `<ErrorBoundary>` as the outermost wrapper to catch unhandled render errors and prevent full white-screen crashes.

**Rules:**

- Only add providers here if they are **truly global** across every page.
- Feature-specific providers go in the feature's `layout.tsx`, not the root.
- Auth state syncing happens in `(dashboard)/layout.tsx`, not in a global AuthProvider — this prevents unauthenticated pages from triggering `/api/auth/me`.
- Never nest more than 6-7 providers — if you need more, compose them in a `<Providers>` wrapper component.

---

## 17. Adding a New Feature (Checklist)

Follow these steps in order when adding a new page or feature area:

### Step 1: Create the Domain Logic Folder

Create `src/lib/<domain>/` with these files:

| File              | Purpose                                                                                 |
| ----------------- | --------------------------------------------------------------------------------------- |
| `types.ts`        | Backend types (`Backend*` prefix, `snake_case`) + frontend types (`camelCase`) + Zod schemas + status constants |
| `transformers.ts` | `Backend*` → frontend type conversion functions                                         |
| `api.ts`          | Service functions using `apiClient`, returning frontend types                           |
| `hooks.ts`        | Server-state hooks (`useQuery` / `useBlockingMutation`) + query key factory             |
| `store.ts`        | Client state store — **only if** this domain needs shared UI state (modals, filters)    |
| `index.ts`        | Barrel: export only what the rest of the app needs                                      |

### Step 2: Create Domain Components

Create `src/components/<domain>/` with the UI components:

| File                       | Purpose                                             |
| -------------------------- | --------------------------------------------------- |
| `<domain>-list.tsx`        | List view (search, filter, pagination, bulk select) |
| `<domain>-form.tsx`        | Modal wrapper (view/edit toggle)                    |
| `<domain>-edit-form.tsx`   | Form internals (React Hook Form + Zod)              |
| `<domain>-view-details.tsx`| Read-only detail view                               |
| `index.ts`                 | Barrel export                                       |

### Step 3: Create the Page

Create `src/app/(dashboard)/<feature>/page.tsx`

### Step 4: Update Config

Update `(dashboard)/config.ts` — add a `PermissionedNavItem` with the feature's route and required permissions. Add the route to `ROUTES`.

### Step 5: Update Middleware

Add the new route prefix to `PROTECTED_PREFIXES` in `proxy.ts`.

### Step 6: Use Shared Components

Import from `@/components/ui` and `@/components/shared` — do not re-implement modals, tabs, or bulk action bars.

### Step 7: Export New Shared Components

If you created a new reusable component, export it through `components/shared/index.ts` or `components/ui/index.ts`.

> **The domain folder structure (Steps 1-2) is the canonical template.** Every domain should have the same pair of folders. A developer navigating to any domain should immediately know where types, API calls, hooks, state, and UI live.

---

## 18. Do's and Don'ts

### Do

- Add `"use client"` at the top of any file using hooks, browser APIs, or event handlers
- Use **Server Components** for initial page data that doesn't need client interactivity
- Use a **server-state library** (React Query / SWR) for interactive, client-side API data
- Use **Server Actions** for simple form submissions where optimistic UI isn't needed
- Use a **client store** (Zustand / Pinia) only for UI state with no server equivalent
- Use a **query key factory** per domain (and per sub-resource) — structured, predictable invalidation
- Use **`useBlockingMutation`** instead of raw `useMutation` for blocking loading overlay
- Use **`placeholderData: (prev) => prev`** in list queries to keep old data during pagination
- Define all design tokens in `globals.css` — never in component files
- Use semantic CSS tokens (`text-primary`, `bg-muted`) — never raw color values
- Surface `err.detail` from `AppError` — show field errors, not just generic toasts
- Use centralized `handleError` functions in hooks.ts for consistent toast error handling
- Select from stores granularly: `useStore((s) => s.specificValue)`
- Keep service functions thin — call `apiClient`, transform, return domain types
- Export all shared components through barrel files
- Define all route strings in `config.ts` `ROUTES` constants
- Use `@/` path aliases for all imports
- Keep domain folders self-contained — types, API, hooks, transformers in one place
- Declare `permission` or `permissions` on every nav item for access control
- Update `PROTECTED_PREFIXES` in proxy when adding new routes
- Use Zod schemas colocated in `types.ts` for form validation
- Use `as const` arrays + `Record<Status, string>` maps for status labels/colors
- Debounce search inputs and expensive computations

### Don't

- Use client stores (Zustand) to cache API responses, loading flags, or fetch functions
- Write hex colors, `rgba()`, or hardcoded values in component files
- Swallow errors silently or show only generic messages
- Scatter one domain's files across `api/services/`, `store/`, and `api/types/`
- Read or manage auth tokens from JavaScript — cookies are server-managed via BFF
- Use relative imports beyond one level (`../../`)
- Add `any` without an explaining comment
- Add global providers without strong justification
- Hardcode role strings or permission strings — use constants from `lib/permissions`
- Put JSX or hooks in `config.ts`
- Create monolithic stores (> 100 lines with fetch logic) — use React Query
- Mix backend `snake_case` and frontend `camelCase` in the same type
- Import `fetch` directly in components — use `apiClient`
- Put form state in global stores — keep it local
- Use Server Actions and React Query mutations for the same operation — pick one
- Create separate `schemas.ts` files — keep Zod schemas in `types.ts`
- Use `keepPreviousData` (deprecated in RQ5) — use `placeholderData` instead

---

## Appendix: Recommended Tech Stack

This guide is designed for the following stack, but the principles apply broadly. Substitute libraries as needed — keep the architecture.

| Layer              | Library                    | Version  | Purpose                              | Alternatives                                    |
| ------------------ | -------------------------- | -------- | ------------------------------------ | ----------------------------------------------- |
| Framework          | Next.js (App Router)       | 16.x     | File-system routing, SSR, proxy | Nuxt, SvelteKit, Remix, Vite + Router           |
| UI Library         | React                      | 19.x     | Component model                      | Vue, Svelte, Solid                              |
| Language           | TypeScript                 | 5.x      | Type safety                          | —                                               |
| Server State       | React Query (TanStack)     | 5.x      | Data fetching, caching, sync         | SWR, Apollo Client, tRPC                        |
| Client State       | Zustand                    | 5.x      | Lightweight client-side stores       | Pinia (Vue), Svelte stores, Jotai, Valtio       |
| Styling            | Tailwind CSS               | 4.x      | CSS-native utility-first (no config) | CSS Modules, Styled Components, Vanilla Extract |
| Form Handling      | React Hook Form + Zod      | RHF 7 + Zod 4 | Forms + schema validation     | Formik + Yup, VeeValidate (Vue)                 |
| Animations         | Framer Motion              | 12.x     | Layout & entrance animations         | Auto Animate, CSS transitions                   |
| Icons              | Lucide React               | 0.575+   | Consistent icon set                  | Heroicons, Phosphor                             |
| Toasts             | Sonner                     | 2.x      | Toast notifications                  | React Hot Toast                                 |
| Date Utilities     | Custom (`date-utils.ts`)   | —        | No external deps, YYYY-MM-DD strings | date-fns, Day.js, Luxon                         |
| PDF Generation     | jsPDF + jsPDF-AutoTable    | 4.x      | Client-side PDF generation           | pdfmake, html2pdf                               |
| Themes             | next-themes                | 0.4.x    | Dark/light mode with system detect   | —                                               |
| Fonts              | Geist (Sans + Mono)        | 1.x      | Clean modern font family             | Inter, SF Pro                                   |
| Testing            | Vitest + Playwright        | —        | Unit + E2E testing                   | Jest + Cypress                                  |
| API Mocking        | MSW                        | —        | Mock API for dev/test                | Mirage.js                                       |

> **Adapting for other stacks:** Substitute the tools but keep the **principles**: domain colocation, server/client state split, transform at boundary, centralized HTTP client, single source of truth for design tokens, typed schemas for validation.

---

## Appendix: Blocking Loading System

The `lib/loading/` module provides a centralized, token-based blocking loading system:

### Architecture

```
Component
     ↓ calls useBlockingMutation
useBlockingMutation         (lib/loading/mutation.ts)
     ↓ wraps useMutation, auto-tracks loading tokens
useBlockingLoadingStore     (lib/loading/store.ts)
     ↓ entries array
GlobalLoadingOverlay        (components/loading/)
     ↓ renders blocking overlay with label
```

### Key Files

| File               | Purpose                                                        |
| ------------------ | -------------------------------------------------------------- |
| `store.ts`         | Zustand store tracking concurrent blocking actions by token ID |
| `types.ts`         | `BlockingLoadSource`: `"auth" \| "route" \| "mutation" \| "upload" \| "custom"` |
| `mutation.ts`      | `useBlockingMutation` — wraps `useMutation` with loading token lifecycle |
| `route-progress.ts`| Single route-level loading token manager                       |
| `router.ts`        | `useTrackedRouter()` — wraps Next.js router with route loading |

### Usage

```ts
// In hooks.ts — use useBlockingMutation instead of useMutation
import { useBlockingMutation } from "@/lib/loading";

export function useCreateLead() {
  return useBlockingMutation(
    { mutationFn: leadApi.createLead, onSuccess: () => { /* ... */ } },
    { source: "mutation", label: "Creating lead" },
  );
}

// In components — use useTrackedRouter instead of useRouter
import { useTrackedRouter } from "@/lib/loading";
const router = useTrackedRouter();
router.push("/projects"); // automatically shows loading overlay during navigation
```

---

## Appendix: Tab Persistence Pattern

Two approaches for keeping tab state in sync with URL:

### 1. Hook-Based (`lib/hooks/use-tab-state.ts`)

For components that manage their own tab state without Zustand:

```ts
const [activeTab, setActiveTab] = useTabState({
  tabs: [{ key: "leads" }, { key: "quotations" }, { key: "deals" }],
  defaultTab: "leads",
  paramName: "tab",  // URL: ?tab=quotations
});
```

Uses `window.history.replaceState` to update URL silently (no Next.js navigation re-render).

### 2. Zustand-Sync (`lib/hooks/use-zustand-tab-sync.ts`)

For domains where tab state is already in Zustand (e.g., `useLeadStore`):

```ts
useZustandTabSync({
  tabs: LEAD_TABS,
  activeTab: store.activeTab,
  setActiveTab: store.setActiveTab,
  paramName: "tab",
});
```

Initializes store from URL on mount, then syncs URL when `activeTab` changes.

---

## Appendix: PDF Generation System

The `lib/pdf/` module generates client-side PDFs using jsPDF:

| File                          | Purpose                                              |
| ----------------------------- | ---------------------------------------------------- |
| `generator.ts`                | Shared utilities: header drawing, footer, field layout |
| `icons.ts`                    | Base64-encoded PNG icons for PDF headers              |
| `templates/purchaseOrder.ts`  | Purchase order PDF template                           |
| `templates/salarySlip.ts`     | Salary slip PDF template                              |
| `templates/*.ts`              | 8 total templates for various documents               |

Each template function receives domain data and returns a downloaded PDF.

---

## Appendix: Engineering Improvement Recommendations

These are suggestions for strengthening the architecture. Mark items as you implement them.

### 1. Add Error Boundary (Priority: High)

The provider stack currently has no error boundary. A root `<ErrorBoundary>` prevents full white-screen crashes on unhandled render errors. React 19 has improved error boundary support.

### 2. Add React Query Devtools (Priority: Medium)

Add `<ReactQueryDevtools>` to `QueryProvider` for development. Tree-shaken in production, zero runtime cost. Essential for debugging cache behavior.

```tsx
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
// Inside QueryProvider, after QueryClientProvider:
{process.env.NODE_ENV === "development" && <ReactQueryDevtools />}
```

### 3. Extract Reverse Transformers (Priority: Medium)

Currently, `api.ts` files manually build snake_case payloads inline inside `createX()` and `updateX()`. For domains with 10+ fields, this means duplicated field mapping. Extract `toBackendLead(values)` functions in `transformers.ts`:

```ts
// transformers.ts
export function toBackendLead(values: Partial<LeadFormValues>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (values.projectName !== undefined) payload.project_name = values.projectName;
  if (values.phone !== undefined) payload.phone = values.phone;
  // …
  return payload;
}
```

### 4. Add `.env.example` (Priority: High)

No environment documentation exists. Create a `.env.example`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 5. Split Status Constants When types.ts Exceeds ~200 Lines (Priority: Low)

Some domain `types.ts` files have 100+ lines of status arrays/labels/colors before any type definitions. When this happens, extract to `constants.ts`. Keep the pattern optional — only split when readability degrades.

### 6. Adopt Optimistic Updates for Inline Status Changes (Priority: Medium)

Inline status changes (e.g., changing a lead status from a dropdown) would benefit from optimistic updates. The user sees the change instantly while the API request is in-flight, with automatic rollback on error.

### 7. Document Permission Keys (Priority: Low)

The ~80 permission keys in `lib/permissions/types.ts` are the contract between frontend and backend. Consider generating this list from the backend API or maintaining a shared definition to prevent drift.
