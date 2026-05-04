# AI Assistant System Prompt — Frontend

Copy and paste the text block below into your IDE's AI rules (e.g., `.cursorrules`, GitHub Copilot Custom Instructions, or ChatGPT Custom Instructions) so the AI contextually understands our frontend architecture and generates code that automatically adheres to our conventions.

````text
# Frontend Architecture — LLM Reference

> **Instructions:** Use this as a system prompt or project context when scaffolding new frontend projects. Treat every rule as a hard constraint.

---

## Core Principles (Non-Negotiable)

1. **Domain colocation** — Group by business domain, not technical layer. All code for "leads" lives in `lib/lead/` + `components/lead/`.
2. **Server state ≠ Client state** — API data → React Query / SWR. UI-only state → Zustand / Pinia. Never mix.
3. **Transform at the boundary** — `snake_case` → `camelCase` once in the service layer. Components never see backend shapes.
4. **Single responsibility** — One component per file. One store per domain. One transformer per domain.
5. **Explicit over implicit** — Type everything. Name every constant. No `any`. No magic strings.
6. **Minimal coupling** — Domains are self-contained. A change in `lead/` never requires touching `project/`.

---

## Project Structure

```

src/
├── app/ # Router (Next.js App Router / equivalent)
│ ├── (auth)/ # Unauthenticated pages
│ ├── (dashboard)/ # Authenticated — permission-gated, not role-gated
│ │ ├── config.ts # PermissionedNavItem[], ROUTES — NO JSX
│ │ ├── layout.tsx # Syncs auth → Zustand, filters nav by permissions
│ │ ├── loading.tsx # Route-segment loading skeleton
│ │ └── <feature>/page.tsx # One folder per feature (flat, no role nesting)
│ ├── api/ # BFF route handlers (auth cookie management)
│ │ └── auth/ # login, me, refresh, logout — httpOnly cookies
│ ├── globals.css # Design tokens (single source of truth, Tailwind v4)
│ ├── layout.tsx # Root layout — provider stack
│ └── page.tsx # Root redirect
│
├── components/
│ ├── <domain>/ # Domain UI components (forms, lists, detail views)
│ │ ├── <domain>-list.tsx
│ │ ├── <domain>-form.tsx
│ │ ├── <domain>-view-details.tsx
│ │ └── index.ts # Barrel export
│ ├── layout/ # Shell (sidebar, top nav, mobile dock)
│ ├── loading/ # Global loading overlay, route loading observer
│ ├── providers/ # Context providers — no visual output
│ ├── shared/ # Truly cross-domain reusable components
│ │ ├── index.ts # Barrel exports
│ │ └── <name>/index.tsx
│ └── ui/ # Primitives (Modal, Tabs, BulkActionBar, ViewToggle)
│
├── hooks/ # App-wide hooks (useMediaQuery, useDebounce)
│
├── lib/ # Business logic — DOMAIN-BASED
│ ├── api-client.ts # Singleton HTTP client (stateless, no stored tokens)
│ ├── utils.ts # cn(), formatCurrency(), formatDate()
│ ├── date-utils.ts # Date utilities (no external deps)
│ ├── <domain>/ # One folder per business domain
│ │ ├── types.ts # Backend* (snake_case) + Frontend (camelCase) + Zod schemas + constants
│ │ ├── transformers.ts # snake_case ↔ camelCase converters
│ │ ├── api.ts # Service functions → apiClient → transform → return frontend types
│ │ ├── hooks.ts # React Query hooks (useQuery / useBlockingMutation)
│ │ ├── store.ts # Zustand — ONLY for shared UI state (modals, filters). Optional.
│ │ └── index.ts # Barrel exports
│ ├── auth/ # Auth domain (login, session, user shape)
│ ├── permissions/ # RBAC (roles, permission checks, hooks, store)
│ ├── access-control/ # Dynamic role/permission CRUD (admin panel)
│ ├── loading/ # Centralized blocking loading system
│ ├── hooks/ # Shared lib hooks (tab state, Zustand-URL sync)
│ └── pdf/ # PDF generation (jsPDF templates)
│
├── proxy.ts # Route protection + API auth header injection
└── types/ # Global types (NavItem, AppError)

```

---

## Domain Folder Rules

Every domain has TWO folders: `lib/<domain>/` for logic, `components/<domain>/` for UI.

| File              | Content                                         | Rule                                                        |
| ----------------- | ----------------------------------------------- | ----------------------------------------------------------- |
| `types.ts`        | `BackendLead` (snake_case) + `Lead` (camelCase) + Zod schemas + status constants | Backend types use `Backend*` prefix. `as const` arrays + `Record<Status, string>` for labels/colors |
| `transformers.ts` | `transformLead(raw) → Lead`                     | Only place backend field names appear                       |
| `api.ts`          | `fetchLeads(params) → LeadListResult`           | Always returns frontend types. apiClient returns data directly (not `{ data }`) |
| `hooks.ts`        | `useLeads()`, `useCreateLead()`                 | Query key factory per domain (+ sub-resources). Use `useBlockingMutation`. Set `staleTime` deliberately |
| `store.ts`        | Modal state, filters, view mode, tab state      | Optional. Never `isLoading`, `error`, `items[]`, `fetchX()` |
| `index.ts`        | Barrel — export only what others need           | Keep it tight                                               |

Transformer example (manual mapping, never auto-mappers):

// lib/lead/transformers.ts
export function transformLead(raw: BackendLead): Lead {
  return {
    id: raw.id,
    leadName: raw.lead_name,
    createdAt: raw.created_at,
    assignedUserId: raw.assigned_user_id,
  };
}

Status constant pattern (in types.ts):

export const LEAD_STATUSES = ["new", "contacted", "qualified", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = { new: "New", contacted: "Contacted", /* … */ };
export const LEAD_STATUS_COLORS: Record<LeadStatus, string> = { new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", /* … */ };

---

## State Management Decision

Does this data come from an API?
├─ YES → Is it initial page load data with no client interactivity?
│        ├─ YES → Server Component (RSC) — async/await, no JS shipped
│        └─ NO  → React Query (client-side cache, refetch, pagination)
└─ NO → Shared across unrelated components?
         ├─ YES → Zustand store
         └─ NO → useState

CRITICAL ANTI-PATTERN — Never put API data (items[], isLoading, fetchX()) in Zustand.

// WRONG — re-implementing React Query inside Zustand
const useLeadStore = create((set) => ({
  leads: [],
  isLoading: false,
  fetchLeads: async (params) => { set({ isLoading: true }); /* ... */ },
}));

// RIGHT — Zustand holds ONLY UI state (modals, filters, tab state)
const useLeadStore = create((set) => ({
  activeTab: "leads",
  isLeadOpen: false,
  editingLead: null,
  isLeadViewMode: false,
  openLeadView: (lead) => set({ isLeadOpen: true, editingLead: lead, isLeadViewMode: true }),
  openLeadForm: (lead) => set({ isLeadOpen: true, editingLead: lead ?? null, isLeadViewMode: false }),
  closeLeadForm: () => set({ isLeadOpen: false, editingLead: null, isLeadViewMode: false }),
  statusFilter: "",
  searchQuery: "",
}));
// API data lives in: const { data, isLoading } = useLeads(params);

React Query hook pattern (use this exact structure per domain):

// lib/lead/hooks.ts
import { useBlockingMutation } from "@/lib/loading";

export const leadKeys = {
  all: ["leads"] as const,
  analytics: () => [...leadKeys.all, "analytics"] as const,
  lists: () => [...leadKeys.all, "list"] as const,
  list: (params) => [...leadKeys.lists(), params] as const,
  detail: (id) => [...leadKeys.all, "detail", id] as const,
};

// Sub-resource key factories for related entities
export const quotationKeys = {
  all: ["quotations"] as const,
  lists: () => [...quotationKeys.all, "list"] as const,
  list: (params) => [...quotationKeys.lists(), params] as const,
  detail: (id) => [...quotationKeys.all, "detail", id] as const,
};

function handleError(err: unknown) {
  const message = err instanceof AppError ? err.message : "An unexpected error occurred";
  toast.error(message);
}

export function useLeads(params = {}) {
  return useQuery({
    queryKey: leadKeys.list(params),
    queryFn: () => leadApi.fetchLeads(params),
    placeholderData: (prev) => prev,  // keep old data during pagination
    staleTime: 30_000,
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useBlockingMutation(
    {
      mutationFn: async (values) => {
        const result = await leadApi.createLead(values);
        await qc.invalidateQueries({ queryKey: leadKeys.lists() });
        return result;
      },
      onSuccess: () => toast.success("Lead created"),
      onError: handleError,
    },
    { source: "mutation", label: "Creating lead" },
  );
}

---

## Server Components & Hydration

For frameworks with SSR/RSC (Next.js, Nuxt, SvelteKit):

- Static first-load data: Fetch in Server Component (async/await). No hooks, no JS shipped.
- Interactive data (tables, filters, pagination): Use React Query in a "use client" component.
- Best of both worlds: Server-fetch initial data → pass as initialData to React Query → no spinner on first load, full cache on navigation.
- Mutations: Use Server Actions for simple forms. Use React Query mutations when you need optimistic updates or cross-component cache invalidation. Pick one per operation, never both.

Mutation rule of thumb: If the mutation needs optimistic UI or updates shared client cache → React Query. Otherwise → default to Server Actions.

---

## API Layer

Component → Hook (hooks.ts) → Service (api.ts) → apiClient (api-client.ts) → Backend

- All requests go through apiClient. No direct fetch() in components.
- apiClient is stateless — never stores tokens. Auth handled by proxy (cookie → Bearer header).
- Methods: get<T>(), post<T>(), patch<T>(), put<T>(), delete(), upload<T>() (FormData).
- apiClient returns data directly (not wrapped in { data }).
- Flattens FastAPI 422 validation errors: [{ msg, loc }] → human-readable string.
- On 401: deduplicates concurrent refresh attempts → retry once → redirect /login on second 401.
- On server-side (RSC/Route Handlers), use a per-request client factory or pass auth explicitly.

---

## Authentication & Permissions

BFF Pattern:
- HTTP-only cookies (access: 2hr, refresh: 7d) — JS never reads tokens.
- BFF routes: /api/auth/login, /api/auth/me, /api/auth/refresh, /api/auth/logout.
- Middleware injects Authorization header for /api/v1/* requests.
- Dashboard layout calls useMe() → syncs user/role/permissions to Zustand.

Permission System (lib/permissions/):
- 5 built-in roles: super_admin, admin, site_supervisor, estimator, client.
- ~80 permission keys in format: resource.action (e.g., labour.manage, projects.view).
- super_admin always passes. Others check effectivePermissions Set.
- Nav items declare permission/permissions — layout filters via useFilteredNavItems().
- Components check: usePermission("leads.manage"), useAnyPermission(["leads.view", "leads.manage"]).
- Middleware has PROTECTED_PREFIXES for route-level protection.
- All roles share the same URL space. Visibility is permission-gated, not folder-gated.

---

## Component Rules

| Directory               | Purpose                                         |
| ----------------------- | ----------------------------------------------- |
| components/<domain>/    | Domain UI — forms, lists, detail views          |
| components/layout/      | Shell layout (sidebar, topnav, mobile dock)     |
| components/loading/     | Global loading overlay, route loading observer  |
| components/providers/   | Context wrappers — no visual output             |
| components/shared/      | Cross-domain reusable components — via barrel   |
| components/ui/          | Primitives — no business logic                  |

- One component per file, kebab-case naming (lead-list.tsx, lead-form.tsx).
- Domain components: <domain>-list.tsx, <domain>-form.tsx, <domain>-edit-form.tsx, <domain>-view-details.tsx.
- Import shared/ui components via barrel.

Hard constraint — component sizing:

| Type             | Max lines | If exceeded                             |
| ---------------- | --------- | --------------------------------------- |
| Page component   | ~200      | Extract sub-components or custom hooks  |
| Shared component | ~150      | Extract sub-components into same folder |
| Custom hook      | ~80       | Split into smaller hooks                |
| Zustand store    | ~50       | You're probably storing server state    |

NEVER generate a single file exceeding 200 lines. Always extract.

---

## Styling

- Tailwind v4 (CSS-native, no tailwind.config file). Tokens in globals.css.
- Use semantic tokens: text-primary, bg-muted. Never text-gray-700, bg-[#f5f5f5].
- Dark mode: class-based via next-themes. Both :root and .dark token sets.
- Fonts loaded once in root layout (Geist Sans/Mono). Never import fonts in components.
- Animations < 300ms. Framer Motion for layout animations.

---

## TypeScript

- No `any` without eslint-disable + explaining comment.
- Type all params and return types.
- Use @/ path aliases. No relative imports beyond ../
- Prefer `as const` arrays with derived union types over standalone enums.
- Use `export type` for type-only exports.
- Zod schemas colocated in types.ts — not in separate schema files.

---

## Error Handling

class AppError extends Error {
  statusCode: number; // 400, 401, 403, 422, 500
  message: string;    // Human-readable — safe to show in toast
  detail: unknown;    // Backend's structured detail (field-level validation errors)
  data: unknown;      // Full raw response body
}

- All API errors are AppError instances — thrown by apiClient.
- apiClient flattens FastAPI 422 errors: [{ msg, loc }] → "field: message" string.
- Never swallow errors. Always show toast or field-level message.
- Use centralized handleError() function in hooks.ts for consistent toast.error().
- Map 422 responses to individual form field errors via err.detail.
- Use onError callback in useBlockingMutation, not try/catch in components.

---

## Forms

- React Hook Form + Zod. Schema = single source of truth for validation & types.
- Zod schemas live in types.ts alongside domain types — not separate files.
- z.infer<typeof schema> generates the TypeScript type.
- Keep form state local. Never in Zustand.
- Use CreatableCombobox for fields where users can add new options.

---

## Blocking Loading System (lib/loading/)

- useBlockingMutation wraps useMutation with global loading overlay tracking.
- Token-based: each operation gets a unique ID, overlay shows label.
- Sources: "auth" | "route" | "mutation" | "upload" | "custom".
- useTrackedRouter wraps Next.js router with route loading tracking.
- GlobalLoadingOverlay renders blocking overlay when any tokens are active.

---

## Performance

- Set staleTime on queries (not 0). Default: 30s.
- Use placeholderData: (prev) => prev for list queries (keeps old data during pagination).
- Virtualize long lists (> 100 rows).
- Debounce search inputs (300ms+).
- Use React.memo only when profiling shows re-render issues.

---

## Module Config

Dashboard has ONE config.ts (pure data, zero JSX, zero hooks):
- dashboardNavItems: PermissionedNavItem[] with permission/permissions fields
- ROUTES object with all URL constants (use functions for dynamic routes)
- Layout filters nav items by user permissions via useFilteredNavItems()
- Dynamic badges computed in layout.tsx (e.g., pending count on Users nav item)

---

## Provider Stack

QueryProvider > ThemeProvider > RouteLoadingObserver > GlobalLoadingOverlay > Toaster

- Auth syncing happens in (dashboard)/layout.tsx, not in a global AuthProvider.
- Only truly global providers in root layout. Feature-specific in feature layout.tsx.

---

## New Feature Checklist

1. Create lib/<domain>/ with types.ts, transformers.ts, api.ts, hooks.ts, store.ts (optional), index.ts
2. Create components/<domain>/ with list, form, edit-form, view-details, index.ts
3. Create app/(dashboard)/<feature>/page.tsx
4. Add PermissionedNavItem + route to (dashboard)/config.ts
5. Add route prefix to PROTECTED_PREFIXES in proxy.ts
6. Import shared/ui components from barrel — don't re-implement

---

## Hard Don'ts

- NO API data in Zustand (isLoading, error, items[], fetchX())
- NO direct fetch() in components
- NO hex colors / rgba() in component files
- NO silent error swallowing
- NO domain files scattered across layer folders
- NO tokens stored in apiClient singleton
- NO deep relative imports (../../..)
- NO `any` without explanation
- NO JSX or hooks in config.ts
- NO raw hardcoded role/permission strings — use constants from lib/permissions
- NO mixing Server Actions + React Query mutations for the same operation
- NO backend snake_case fields leaking into components
- NO separate schemas.ts files — Zod schemas go in types.ts
- NO keepPreviousData (deprecated RQ5) — use placeholderData instead
- NO per-role route folders — use permission-gated flat routes

---

## Tech Stack (Defaults — Substitute as Needed)

| Concern        | Default                    | Version | Alternatives                     |
| -------------- | -------------------------- | ------- | -------------------------------- |
| Framework      | Next.js (App Router)       | 16.x    | Nuxt, SvelteKit, Remix, Vite    |
| UI             | React                      | 19.x    | Vue, Svelte, Solid              |
| Server State   | React Query                | 5.x     | SWR, Apollo, tRPC               |
| Client State   | Zustand                    | 5.x     | Pinia, Jotai, Valtio            |
| Styling        | Tailwind CSS (v4, CSS-native) | 4.x  | CSS Modules, Styled Components  |
| Forms          | React Hook Form + Zod      | RHF7+Zod4 | Formik + Yup                 |
| Animations     | Framer Motion              | 12.x    | Auto Animate, CSS transitions   |
| Toasts         | Sonner                     | 2.x     | React Hot Toast                  |
| Icons          | Lucide React               | —       | Heroicons, Phosphor              |
| Themes         | next-themes                | —       | —                                |
| PDF            | jsPDF + jsPDF-AutoTable    | —       | pdfmake, html2pdf                |
| Dates          | Custom (date-utils.ts)     | —       | date-fns, Day.js                 |
| Testing        | Vitest + Playwright        | —       | Jest + Cypress                   |
| API Mocking    | MSW                        | —       | Mirage.js                        |

Substitute tools, keep principles: domain colocation, server/client state split, transform at boundary, stateless HTTP client, design tokens as single source of truth, permission-gated routing.
````
