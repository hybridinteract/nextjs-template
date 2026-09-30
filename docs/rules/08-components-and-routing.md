# Components & Routing

> Read this before you add a page, a route, a dialog, or a provider.
> Last verified against the code: 30 Sep 2026.

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
  a bespoke dialog. `placement="center"` opens it in the middle of a laptop screen, for
  starting something new. A phone always gets the bottom sheet.
- Read-only rows use `<DetailRow>`; form fields use `<Field>` — both from
  `@/components/shared`.
- Reach for the shared barrel before writing a new control.
- Import route strings from `ROUTES` in `app/(dashboard)/config.ts`. Never inline
  `/dashboard/orders` in a component.
- `config.ts` is **pure data** — zero JSX, zero hooks.

## 3. How it works here

```
src/app/
  layout.tsx                       root: fonts, metadata, the theme. Nothing else.
  error.tsx / global-error.tsx / not-found.tsx
  (site)/                          public, no providers
    layout.tsx                     header and footer
    page.tsx                       the home page, at "/"
  (auth)/
    layout.tsx                     mounts <AppProviders>, noindex
    login/page.tsx                 unauthenticated
  (dashboard)/
    config.ts                      nav items + ROUTES. Pure data.
    layout.tsx                     mounts <AppProviders>, seeds auth + role stores, renders the shell
    dashboard/
      layout.tsx                   export const dynamic = "force-dynamic"
      error.tsx                    keeps the shell alive when a page crashes
      <domain>/page.tsx            server component
      <domain>/loading.tsx         route skeleton
```

**Provider stack.** The root layout holds `ThemeProvider` and nothing else. `(auth)` and
`(dashboard)` each mount `<AppProviders>` (`components/providers/app-providers.tsx`):
`QueryProvider` → `<Toaster>` → `{children}` → `GlobalLoadingOverlay` →
`SessionExpiredDialog`. Only add a provider to the root layout if the public site needs it
too. One the signed-in half needs goes in `AppProviders`. A feature-scoped one goes in
that feature's `layout.tsx`.

**Why the split.** Until 30 Sep 2026 all of it sat in the root layout, and a public page
would have downloaded all of it for nothing. Measured on a production build, the home
page loads 181KB of script gzipped, against 214KB with the providers in the root layout.
The theme stays in the root: its class has to be on `<html>` before the first paint, or
the page flashes the wrong theme.

**One query client per browser tab.** Moving from `/login` to `/dashboard` unmounts the
`(auth)` layout and mounts the `(dashboard)` one, and with them their `QueryProvider`s.
`useLogin` fetches `/me` just before that move, so the sidebar draws its menu on the first
paint. With a client per mount, that fetch went into a cache that was then thrown away, and
the dashboard fetched `/me` again. So `QueryProvider` makes one client per tab in the
browser, and a new one per request on the server, where sharing would hand one person's
data to the next. Influen split its providers the same way on a client per mount, and its
sign-in has this bug. `e2e/auth.spec.ts` counts the `/me` calls.

**The toaster does not survive the move.** Each group's `AppProviders` has its own
`<Toaster>`. A toast raised just before sign-in or sign-out changes group goes with the
old one. Say it on the page you land on, as Influen's `?signedOut=1` notice does.

**`<Toaster>` is first on purpose.** React runs an earlier sibling's effects before a later
one's, and sonner's Toaster only shows toasts raised after its own effect subscribes. It
used to be last, so a toast raised while a page mounted went nowhere. Influen found it when
its "you're signed out" notice on the login page never appeared. Toasts from a click or a
mutation were never affected, which is why nobody noticed. It sets its own z-index, so its
DOM position does not change what is on top.

**The Modal is a dialog to a screen reader.** The panel has `role="dialog"` and is named by
its title. It has no `aria-modal`: the Select lists and popovers inside it portal to
`<body>`, outside the panel, and `aria-modal` says everything outside is out of reach.

**Escape closes the top layer only.** A Radix layer inside the panel (a Select's list, a
popover, an AlertDialog) closes itself on Escape and marks the key handled, and the Modal
then ignores that key. Until 30 Sep 2026 the Modal closed as well, so backing out of a
dropdown threw the whole panel away.

Auth state is seeded in `(dashboard)/layout.tsx`, not a global AuthProvider — that keeps
unauthenticated pages from firing `/api/auth/me`. The layout renders `<AppProviders>` and
does the seeding in a child, `DashboardFrame`, because `useMe` needs the query client
above it.

**The public site** (`app/(site)`) is pages anyone can read without signing in. The
template ships a placeholder home page at `/` and a plain header and footer. Replace
them with the product's own. It mounts no providers. A public page that needs data or
toasts, a contact form say, mounts `<AppProviders>` in its own layout. Its "Sign in" link
suits someone already signed in too, because the proxy sends them from `/login` straight
to the dashboard. Checking the cookie in the header instead would make every public page
render per request. The `(auth)` layout marks every sign-in page `noindex`, so search
engines that follow that link never list it. An app with no public site runs
`node ncube.js remove site`, and `/` goes to the dashboard again.

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
| **No `robots.txt`** | Nothing public needs hiding. The dashboard sits behind the proxy, and the sign-in pages carry `noindex`, which does more than a `robots.txt` block: a blocked page is never fetched, so its `noindex` is never read, and its address can still be listed. Herbally IP has one. Add it when there is something public to keep out. |
| **No signed-in state in the public header** | Knowing needs the cookie, and reading it makes every public page render per request. "Sign in" already takes a signed-in person to the dashboard. |

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
# Query, toasts or the overlay in the root layout. Expect zero: they belong in
# AppProviders, or every public page downloads them.
grep -nE "QueryProvider|Toaster|GlobalLoadingOverlay|SessionExpiredDialog" src/app/layout.tsx
```

```bash
# Bespoke dialogs bypassing <Modal>.
grep -rn "<Dialog\b" src/components/ | grep -v "components/ui/"
```
