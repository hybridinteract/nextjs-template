# Mutations, Toasts & the Loading Overlay

> Read this before you add a write, or make anything say "Saved".
> Last verified against the code: 19 Aug 2026.

Guardrail: [`../../CLAUDE.md`](../../CLAUDE.md) §5.

---

## 1. What & why

Every write goes through `useBlockingMutation`, which raises a global overlay for the
duration. Every write announces itself exactly once, from the hook.

Both rules exist for the same reason: without them the same save produces two toasts (one
from the hook, one from the component) and the user can double-submit while the first
request is in flight. Both are the kind of bug that only appears on a slow connection,
which is to say: only for the customer.

## 2. The rules

- Writes use **`useBlockingMutation`** (`@/lib/loading`) with a `label`. Not plain
  `useMutation`.
- `invalidateQueries` goes **inside** the `mutationFn`, awaited before it returns. Outside,
  the overlay drops before the list has refreshed and the user sees stale rows.
- **Success toasts live in the hook's `onSuccess`.** Components `await mutateAsync()` then
  close or reset. They do **not** toast success.
- Errors go through the module's `handleError` → `toast.error`.
- **Exception — multi-step forms.** One user action that fires several mutations (entity +
  photo + documents) emits **one aggregated** toast in the component, and those
  building-block hooks stay silent on success.
- Inline validation errors stay inline. `<Toaster>` is mounted once in
  `src/app/layout.tsx`; do not add another.

## 3. How it works here

```ts
export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useBlockingMutation(
    {
      mutationFn: async (values: OrderFormValues) => {
        const result = await orderApi.createOrder(formToPayload(values));
        await queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
        return result;
      },
      onSuccess: () => toast.success("Order created"),
      onError: handleError,
    },
    { source: "mutation", label: "Creating order…" },
  );
}
```

| File | Responsibility |
|---|---|
| `src/lib/loading/store.ts` | A Zustand store tracking concurrent blocking actions by token. |
| `src/lib/loading/mutation.ts` | `useBlockingMutation` — owns the token lifecycle. |
| `src/lib/loading/types.ts` | `BlockingLoadSource`: `"auth" \| "route" \| "mutation" \| "upload" \| "custom"`. |
| `src/components/loading/global-loading-overlay.tsx` | Renders the label. |

The store is keyed by token, not a boolean, so two overlapping writes do not lower the
overlay when the first one finishes.

## 4. Deliberately not done

| Not done | Why |
|---|---|
| **The overlay is not used for one-click toggles** | A full-screen block for "mark as read" is heavier than the action. Those want an optimistic update instead — but make that call per action, not as a blanket policy. |
| **No toast on login** | The navigation is the acknowledgement. A toast fired there rides through the transition and lands on the next page looking orphaned. |
| **No `onSettled` invalidation** | Invalidating in `onSettled` runs on failure too, which refetches to prove nothing changed. |

## 5. New module checklist

1. Every mutation hook wraps `useBlockingMutation` with a human `label`.
2. Invalidate inside `mutationFn`, awaited.
3. One `toast.success` per user action, in the hook.
4. One `handleError` per module, used by every mutation in it.

## 6. How to re-check this doc

```bash
# Plain useMutation for a write. Expect exactly one: `useLogin`, whose button
# carries its own pending state and whose overlay would be heavier than the
# action. Everything else uses useBlockingMutation.
grep -rn "return useMutation(" src/lib/ | grep -v "loading/mutation.ts"
```

```bash
# Duplicate success toasts — a component announcing what the hook already
# announced. Expect exactly one file: `data-view/bulk-action-bar.tsx`, which is
# the aggregated-toast exception — one bulk action fans out to many writes and
# reports a single outcome ("12 updated, 1 failed").
grep -rln "toast.success" src/components/
```

```bash
# A second Toaster. Expect exactly one, in app/layout.tsx.
grep -rn "<Toaster" src/
```
