# Wire Format ↔ Domain Format

> Read this before you add a field that comes from or goes to the backend.
> Last verified against the code: 19 Aug 2026.

Guardrail: [`../../CLAUDE.md`](../../CLAUDE.md) §2.

---

## 1. What & why

The backend speaks **snake_case**. The frontend speaks **camelCase**. The conversion
happens in exactly one file per domain — `transformers.ts` — and nowhere else.

One boundary means one place to look when a field arrives `undefined`. Without it,
`created_at` and `createdAt` both float around the codebase, half the components handle
both, and a backend rename produces a silent blank instead of a compile error.

## 2. The rules

- Components and hooks only ever see camelCase. Convert at the transformer, nowhere else.
- **Request payloads are the exception** — they are snake_case (`CreateXPayload`), because
  they go straight to the API. `formToPayload()` produces them.
- Money and decimal values arrive as **strings and stay strings**. Never parse one into a
  number to do arithmetic. See [`12-dates-and-numbers.md`](12-dates-and-numbers.md).
- Coerce unknown enum strings with `asEnum(raw, ALLOWED, fallback)`. Never cast a raw
  backend string straight to an enum type.
- Derive enum types from `as const` arrays, not hand-written string unions — the array is
  then usable at runtime for `asEnum` and for filter options.

## 3. How it works here

```ts
// types.ts
export const ORDER_STATUSES = ["draft", "placed", "shipped"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface BackendOrder {
  id: string;
  order_number: string;
  status: string;          // a plain string on the wire — the backend may add values
  total_amount: string;    // money: a decimal string, never a number
  created_at: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: string;
  createdAt: string;
}
```

```ts
// transformers.ts — every module carries its own copy of this helper
function asEnum<T extends readonly string[]>(
  raw: string | null | undefined,
  allowed: T,
  fallback: T[number],
): T[number] {
  return allowed.includes(raw as T[number]) ? (raw as T[number]) : fallback;
}

export function transformOrder(raw: BackendOrder): Order {
  return {
    id: raw.id,
    orderNumber: raw.order_number,
    status: asEnum(raw.status, ORDER_STATUSES, "draft"),
    totalAmount: raw.total_amount,
    createdAt: raw.created_at,
  };
}
```

**Why `asEnum` and not a cast.** A cast tells TypeScript the value is one of three things.
The backend is free to add a fourth next week. The cast compiles, the value flows into a
`Record<OrderStatus, string>` lookup, and the UI renders `undefined` — a blank cell with no
error anywhere. `asEnum` turns that into a visible fallback.

## 4. Deliberately not done

| Not done | Why |
|---|---|
| **No generic `camelize()` helper** | It would convert keys the domain type does not declare, so a backend rename would produce a new camelCase key nobody reads, and the type would still say the old one exists. Hand-written transformers make a rename a compile error. |
| **No zod parsing of every response** | Runtime validation of every list row is real cost for a boundary that is already typed and already has `asEnum` on the values that actually vary. Use zod on **forms**, where the input is a human. |
| **No reverse transformers by default** | `formToPayload` is per-form and usually not a mirror of `transformX` — it trims, drops empties, and omits server-owned fields. |

## 5. New module checklist

1. Write `Backend*` interfaces that match the wire **exactly**, including snake_case.
2. Write the domain interface in camelCase.
3. Copy `asEnum` into `transformers.ts`; use it for every enum-shaped field.
4. Keep money and quantities as `string`.
5. Write `formToPayload` when you add the form, not before.

## 6. How to re-check this doc

```bash
# snake_case leaking into components. Expect zero (payload keys live in lib/).
grep -rnE "\.[a-z]+_[a-z]+" src/components/ --include="*.tsx" | grep -v "aria-\|data-"
```

```bash
# Every module that talks to the API needs a transformer beside it.
# (Keyed on api.ts, not types.ts: lib/loading and lib/permissions have types
# and no wire boundary, so they correctly have no transformer.)
for d in src/lib/*/; do
  [ -f "$d/api.ts" ] && [ ! -f "$d/transformers.ts" ] && echo "MISSING: $d"
done; echo done
```
