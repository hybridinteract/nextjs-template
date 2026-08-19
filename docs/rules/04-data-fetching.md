# Data Fetching — TanStack Query

> Read this before you add a query, change a `staleTime`, or debug stale data.
> Last verified against the code: 19 Aug 2026.

Guardrail: [`../../CLAUDE.md`](../../CLAUDE.md) §4.

---

## 1. What & why

Server data lives in TanStack Query. Client data lives in Zustand or component state.
Confusing the two is the most common and most expensive mistake in this codebase's
lineage: server data copied into a store goes stale the moment anything else writes, and
nothing tells you.

**The test:** if the value came from the backend and could change because someone else did
something, it is server state. It belongs in a query, not a store.

## 2. The rules

- Every domain owns a **query-key factory**. Build keys only from it, or invalidation
  silently misses.
- Lists use `placeholderData: (prev) => prev` so the table does not flicker on a param
  change. Detail and dependent queries gate with `enabled: Boolean(id)`.
- Pick a `staleTime` from the tiers below rather than inventing a number.
- The global `QueryClient` already sets `staleTime: 30_000`, disables refetch-on-focus and
  skips retry on 401/403/404. **Do not re-configure these per call.**
- After a write, do not trust nested collections in the mutation's response — refetch.
- Never put server data in a Zustand store.

## 3. How it works here

```ts
export const orderKeys = {
  all: ["orders"] as const,
  lists: () => [...orderKeys.all, "list"] as const,
  list: (params: OrderListParams) => [...orderKeys.lists(), params] as const,
  detail: (id: string) => [...orderKeys.all, "detail", id] as const,
};
```

Invalidating `orderKeys.lists()` clears every list regardless of params, because every list
key starts with that prefix. That only holds if nobody hand-writes `["orders", "list"]`
somewhere — which is the whole reason the factory exists.

### `staleTime` tiers

| Tier | Use for |
|---|---|
| `10_000` (10s) | Data that changes while someone is watching it — a queue, a live status board. |
| `30_000` (30s) | **The default.** Ordinary operational lists and records. |
| `60_000` (1min) | Slower-moving records — settings, users, catalogues. |
| `5 * 60_000` (5min) | Config and reference data. `useReferenceOptions` already uses this. |
| `Infinity` | Immutable once loaded — an issued document's snapshot. |

Reach for a longer tier when a picker refetches on every keystroke pause, and a shorter one
only when someone has actually complained about staleness.

| File | Responsibility |
|---|---|
| `src/components/providers/query-provider.tsx` | The global defaults and the retry policy. |
| `src/lib/<domain>/hooks.ts` | The key factory and every query/mutation for that domain. |
| `src/lib/reference/hooks.ts` | The worked example of a longer tier. |

## 4. Deliberately not done

| Not done | Why |
|---|---|
| **No `refetchOnWindowFocus`** | Off globally. On a form-heavy internal app, alt-tabbing back and watching every list reload is noise, and it can stomp a half-filled dependent field. |
| **No suspense queries** | They move the loading state into a boundary, which reads well in a demo and badly in a list page that wants a skeleton *inside* the table. `<DataView>` handles it explicitly instead. |
| **No global `onError`** | Errors are surfaced per module by `handleError` in `hooks.ts`, because the useful message is domain-specific. See [`05-mutations-and-toasts.md`](05-mutations-and-toasts.md). |
| **No optimistic updates by default** | They are right for a one-click toggle and wrong for anything with server-side validation. Add them per action, deliberately. |

## 5. New module checklist

1. Write the key factory first, before any hook.
2. `useX(params)` for the list, with `placeholderData` and a tier.
3. `useXDetail(id)` with `enabled: Boolean(id)`.
4. Mutations wrap `useBlockingMutation` and invalidate **inside** the `mutationFn`.
5. Nothing from the backend lands in a Zustand store.

## 6. How to re-check this doc

```bash
# Hand-written query keys — anything not built from a factory.
grep -rn "queryKey: \[" src/lib/ --include="hooks.ts" | grep -v "Keys\."
```

```bash
# staleTime values in use. Every one must be a tier from the table above —
# and written the same way, so this grep can count them. `5 * 60_000`, not
# `5 * 60 * 1000`.
grep -rho "staleTime: [^,]*" src/ | sort | uniq -c | sort -rn
```

```bash
# Per-call overrides of the global policy. Expect two files:
#   query-provider.tsx  — the policy itself
#   lib/auth/hooks.ts   — `retry: false` on /me. A failure there means "not
#                         signed in"; retrying only delays the redirect.
grep -rn "refetchOnWindowFocus\|retry:" src/
```
