# TypeScript

> Read this before you reach for `any`, or write a type by hand.
> Last verified against the code: 19 Aug 2026.

Guardrail: [`../../CLAUDE.md`](../../CLAUDE.md) §11.

---

## 1. What & why

`strict` is on and there is no `any` in the codebase. The point is not purity — it is that
every `any` is a place where a backend rename becomes a runtime blank instead of a build
failure, and blanks are found by customers.

## 2. The rules

- **No `any`.** Use `unknown` plus narrowing.
- Derive enums and labels from `as const` arrays, not loose string unions — the array is
  usable at runtime.
- Props are explicit `interface`s.
- Prefer `import type { … }` for type-only imports.
- Mark a deliberately unused binding with a leading `_`; the ESLint config ignores those.
- A union that includes `string` is just `string`. Do not widen a literal union "to be
  safe" — see [`06-permissions.md`](06-permissions.md) §3 for what that cost once.

## 3. How it works here

```ts
// Runtime array first, type derived from it.
export const ORDER_STATUSES = ["draft", "placed", "shipped"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

// The array drives asEnum, the filter options and the tone map — one source.
const STATUS_TONE: Record<OrderStatus, StatusTone> = {
  draft: "neutral",
  placed: "info",
  shipped: "success",
};
```

`Record<OrderStatus, …>` is the quiet win: add a status to the array and every map keyed on
it fails to compile until you handle the new case.

**Narrowing an unknown error:**

```ts
function handleError(err: unknown) {
  const message = err instanceof AppError ? err.message : "Something went wrong";
  toast.error(message);
}
```

Key settings in `tsconfig.json`: `strict`, `noEmit`, `moduleResolution: "bundler"`,
`jsx: "react-jsx"`, and `paths: { "@/*": ["./src/*"] }`. `**/*.test.ts` is excluded because
the test files use explicit `.ts` import specifiers, which `tsc` refuses without
`allowImportingTsExtensions`; Node's runner resolves them natively.

## 4. Deliberately not done

| Not done | Why |
|---|---|
| **No `noUncheckedIndexedAccess`** | It is correct, and it makes every array index `T \| undefined`, which adds a non-null assertion to a great deal of ordinary list code. Turn it on in a project that needs it; the template does not impose it. |
| **No enums (`enum Foo`)** | TypeScript enums emit runtime code, do not narrow from strings, and are awkward across the wire boundary. `as const` arrays do everything needed. |
| **No branded types for ids** | A `ClientId` distinct from `OrderId` catches real bugs and costs a cast at every boundary. Not worth it at template scale; add it in a project with many id types in flight. |

## 5. New module checklist

1. `as const` arrays for every enum-shaped field.
2. `Record<TheEnum, …>` for every label and tone map.
3. `interface` for props, `type` for unions and derived types.
4. `import type` for anything only used as a type.
5. `npm run type-check` clean before you call it done.

## 6. How to re-check this doc

```bash
# any. Expect zero.
grep -rn ": any\b\|<any>\|as any\b" src/ --include="*.ts" --include="*.tsx"
```

```bash
# Unions widened with `| string`, which collapses them.
grep -rn "\[number\] | string" src/
```

```bash
# @ts-ignore / @ts-expect-error. Each one needs a reason on the line above.
grep -rn "@ts-ignore\|@ts-expect-error" src/
```
