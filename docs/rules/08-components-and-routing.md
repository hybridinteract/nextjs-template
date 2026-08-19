# Components & Routing

> Read this before you add a page, a route, or a dialog.
> Last verified against the code: 19 Aug 2026.

Guardrail: [`../../CLAUDE.md`](../../CLAUDE.md) §8.

---

## 1. What & why

`page.tsx` is a **Server Component**. It exports metadata, renders `<PageLayout>`, and
mounts one client view. No hooks, no data fetching.

Keeping the default server means `"use client"` marks a real boundary rather than
decorating every file. Everything below a `"use client"` is in the browser bundle, so a
page component that carries the directive drags its whole subtree in with it.

## 2. The rules

- Add `"use client"` **only** where hooks or interactivity are needed.
- `page.tsx`: `export const metadata`, `<PageLayout>`, mount `<XView />`. Nothing else.
- Detail, create and edit use the shared `<Modal>` (`@/components/ui/modal`). Do not build
  a bespoke dialog.
- Read-only rows use `<DetailRow>`; form fields use `<Field>` — both from
  `@/components/shared`.
- Reach for the shared barrel before writing a new control.
- Import route strings from `ROUTES` in `app/(dashboard)/config.ts`. Never inline
  `/dashboard/orders` in a component.
- `config.ts` is **pure data** — zero JSX, zero hooks.

## 3. How it works here

```
src/app/
  layout.tsx                       root: fonts, providers, global surfaces
  error.tsx / global-error.tsx / not-found.tsx
  (auth)/login/page.tsx            unauthenticated
  (dashboard)/
    config.ts                      nav items + ROUTES. Pure data.
    layout.tsx                     seeds auth + role stores, renders the shell
    dashboard/
      layout.tsx                   export const dynamic = "force-dynamic"
      error.tsx                    keeps the shell alive when a page crashes
      <domain>/page.tsx            server component
      <domain>/loading.tsx         route skeleton
```

**Provider stack** (`app/layout.tsx`, outermost → innermost): `QueryProvider` →
`ThemeProvider` → `{children}` → `GlobalLoadingOverlay` → `SessionExpiredDialog` →
`<Toaster>`. Only add a provider here if it is **truly global**; a feature-scoped provider
belongs in that feature's `layout.tsx`.

Auth state is seeded in `(dashboard)/layout.tsx`, not a global AuthProvider — that keeps
unauthenticated pages from firing `/api/auth/me`.

**`dynamic = "force-dynamic"`** on `dashboard/layout.tsx` is required: `useSearchParams`,
which `useDataView` and `useTabState` both read, cannot run during static prerendering.
Setting it once beats wrapping every list page in its own `<Suspense>`.

**Tab state persists to the URL.** Use `useTabState` when the component owns its tabs, or
`useZustandTabSync` when a store already holds `activeTab`. Do not hand-roll `?tab=`.

**Nav grouping.** A `group` on a nav item becomes a sidebar section heading. Past about
eight modules a flat list stops being scannable.

## 4. Deliberately not done

| Not done | Why |
|---|---|
| **No server-side data fetching in pages** | It splits fetching across two systems — RSC for the first paint, React Query for everything after — and they hold different copies of the same row. One owner is simpler than a fast first paint here. |
| **No Server Actions for writes** | Same reason. Mutations go through `useBlockingMutation` so they share one overlay, one toast policy and one invalidation contract. |
| **`@/components/shared` cannot be imported from a Server Component** | Its barrel pulls in `lazy.tsx`, which calls `dynamic(..., { ssr: false })`. From a `page.tsx`, import the component by its own path. The build error points at `lazy.tsx`, not at your import, so this is worth remembering. |
| **No route-level permission checks** | See [`06-permissions.md`](06-permissions.md) §4. |

## 5. New module checklist

1. `page.tsx` — server component, metadata, `<PageLayout>`, mount the view.
2. `loading.tsx` — a skeleton matching the page's shape.
3. `<XView>` carries `"use client"` and owns interaction state.
4. Detail and edit go in one `<Modal>` with `mode` view↔edit.
5. Add the route to `ROUTES` and the nav item to `dashboardNavItems`.

## 6. How to re-check this doc

```bash
# "use client" on a page. Expect zero.
find src/app -name "page.tsx" -exec grep -l "use client" {} \;
```

```bash
# Inline route strings in components. Expect zero.
grep -rn "\"/dashboard/" src/components/
```

```bash
# JSX or hooks in the nav config. Expect zero.
grep -nE "use[A-Z]|<[A-Z]" "src/app/(dashboard)/config.ts"
```

```bash
# Bespoke dialogs bypassing <Modal>.
grep -rn "<Dialog\b" src/components/ | grep -v "components/ui/"
```
