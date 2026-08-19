# Module Anatomy

> Read this before you create a new folder anywhere under `src/`.
> Last verified against the code: 19 Aug 2026.

Guardrail: [`../../CLAUDE.md`](../../CLAUDE.md) §1.

---

## 1. What & why

Every domain is split into a **data layer** (`src/lib/<domain>/`) and a **UI layer**
(`src/components/<domain>/`), surfaced by a route at
`src/app/(dashboard)/dashboard/<domain>/page.tsx`.

The split exists so that the answer to "where does this code go?" is never a judgement
call. When it is a judgement call, a fetch ends up inside a component, and then that
component cannot be reused, cannot be tested, and re-fetches on every render because
nothing owns its cache key. The layering is the thing that keeps a nine-month-old module
readable.

## 2. The rules

- The dependency direction is strict and one-way:
  `page.tsx` → `components/<domain>` → `lib/<domain>/hooks` → `api` → `api-client`.
- **Never** call `apiClient` or `fetch` from a component.
- **Never** import another domain's `api.ts` or `transformers.ts` directly. Go through its
  barrel or its hooks.
- Components import from `@/lib/<domain>`, never from a deep path inside it.
- A file named `utils.ts`, `helpers.ts`, `shared.ts` or `common.ts` **inside a domain
  folder** is a file whose author has not decided what it is. Name it for the concept it
  holds — `permissions/check.ts`, not `permissions/helpers.ts`. The one sanctioned exception
  is the root `src/lib/utils.ts`, which holds `cn()` and nothing else.

## 3. How it works here

`src/lib/<domain>/`:

| File | Responsibility |
|---|---|
| `types.ts` | Enums + labels, `Backend*` (wire, snake_case) shapes, frontend (camelCase) shapes, payload/param types, `PAGE_SIZE`. |
| `transformers.ts` | **The only** snake_case↔camelCase boundary. Pure functions, `transformX(raw): X`. Carries its own `asEnum`. |
| `api.ts` | Thin functions over `apiClient`; calls a transformer on every response. No `fetch`, no React. |
| `hooks.ts` | `"use client"`. Query-key factory + `useX` queries + `useXMutation` mutations. Toasts and invalidation live here. |
| `index.ts` | The public barrel. |

`src/components/<domain>/`:

| File | Responsibility |
|---|---|
| `<x>-view.tsx` | `"use client"`. The list surface, built on `<DataView>`. Owns interaction state. |
| `<x>-form.tsx` | The form fields. Presentational — takes values and an onChange. |
| `<x>-detail-modal.tsx` | The detail/edit panel, built on `<Modal>`. |
| `index.ts` | The public barrel. |

**Domain groups.** When several modules form one business area, nest both layers under a
group folder: `src/lib/crm/leads/` + `src/components/crm/leads/`. Each sub-module keeps the
full anatomy and its own barrel; consumers import from `@/lib/crm/leads` directly. There is
**no group-level barrel** — it would pull every sibling into every import. Route folders
stay flat at `app/(dashboard)/dashboard/<module>/`, so URLs and permission strings do not
change when you regroup.

## 4. Deliberately not done

| Not done | Why |
|---|---|
| **No per-domain `store.ts` for list state** | Page, search, filters and sort live in the URL via `useDataView`. A Zustand store for them is a second source of truth that the URL immediately contradicts. See [`07-list-pages.md`](07-list-pages.md). A store for genuine *client* state (a wizard step, a collapsed panel) is fine. |
| **No shared `asEnum` export** | Each `transformers.ts` carries its own eight-line copy. A shared one would need a home, and `lib/utils.ts` is exactly the dumping ground this rule exists to prevent. Copying eight lines is cheaper than the import graph. |
| **No `services/` or `models/` folders** | Those names describe a layer, not a concept. The domain folder already is the layer. |

## 5. New module checklist

1. `src/lib/<domain>/types.ts` — wire shapes first, then domain shapes.
2. `transformers.ts` — copy `asEnum` from an existing module.
3. `api.ts` — one function per endpoint, transformer on every response.
4. `hooks.ts` — key factory, then queries, then mutations.
5. `index.ts` — export only what components need.
6. `src/components/<domain>/` — view, form, detail modal, barrel.
7. `src/app/(dashboard)/dashboard/<domain>/page.tsx` + `loading.tsx`.
8. Register the route in `app/(dashboard)/config.ts` and the permissions in
   `lib/permissions/`.

`node ncube.js startdomain <Name>` generates all of this.

## 6. How to re-check this doc

```bash
# A component calling the API directly. Expect zero.
grep -rn "apiClient\.\|fetch(" src/components/ --include="*.tsx"
```

```bash
# Deep imports across domains. Expect zero.
grep -rn "from \"@/lib/[a-z-]*/\(api\|transformers\)\"" src/
```

```bash
# Dumping-ground filenames inside a domain. Expect zero.
# src/lib/utils.ts is the sanctioned exception — it holds cn() only.
find src/lib src/components \( -name "utils.ts" -o -name "helpers.ts" \
  -o -name "shared.ts" -o -name "common.ts" \) | grep -v "^src/lib/utils.ts$"
```
