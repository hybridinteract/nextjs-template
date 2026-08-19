# Testing

> Read this before you add a test, or decide something does not need one.
> Last verified against the code: 19 Aug 2026.

Guardrail: [`../../CLAUDE.md`](../../CLAUDE.md) §16.

---

## 1. What & why

`npm test` runs Node's built-in test runner with native TypeScript stripping. **No
dependency, no build step, no config.**

This is deliberately not a full testing strategy. It covers the modules whose failure mode
is **silent** — a wrong penny in a total, a date one day off, a discard prompt that never
fires. None of those throw. None are caught by `tsc` or by a build. They are found by a
customer, weeks later, and by then the wrong number is in a document somebody acted on.

Everything else in the app fails loudly, and the type checker plus the build catch most of
it.

## 2. The rules

- Test files sit beside the module: `src/lib/numeric/numeric.test.ts`.
- Use `node:test` and `node:assert/strict`. Nothing else.
- Import with an explicit extension: `from "./money.ts"`.
- Test **pure functions with silent failure modes** first: money, dates, dirty-checking,
  parsing.
- An assertion that is hard to write is telling you the function has too many jobs.
- Every test needs a comment saying what breaks in production if it fails. A test whose
  purpose is unclear gets deleted the first time it is inconvenient.

## 3. How it works here

| File | Covers |
|---|---|
| `src/lib/numeric/numeric.test.ts` | Float drift, half-up rounding, line totals, tax, quantity padding, locale pinning, garbage input. |
| `src/lib/date-utils.test.ts` | The business-date off-by-one, zone handling for instants, the fixed output format, malformed input. |
| `src/lib/forms/dirty.test.ts` | Dirty against opened-state, null/undefined equality, line-item arrays, unloaded forms. |
| `scripts/test-hooks.mjs` | Module resolution: extensionless relative imports and the `@/` alias. |

**Why the resolver hooks.** Node's ESM loader will not resolve `./decimal` without an
extension, and knows nothing about the `@/` path alias. Without the hooks only a module
with **no runtime imports** could be tested — which limits the suite to leaf files, exactly
the ones least likely to carry a bug. Thirty lines makes anything under `src/` testable.

Type-only imports never reach the hooks: stripping removes them first.

## 4. Deliberately not done

| Not done | Why |
|---|---|
| **No component or DOM testing** | It needs jsdom, a renderer and a testing library — three dependencies and a config, to assert things a person can see in a second. The shared systems are exercised by every page that uses them. |
| **No Vitest or Jest** | Both are good. Both are also a dependency, a config file and a second module-resolution model to keep in step with tsconfig. Node's runner is already installed. |
| **No end-to-end suite** | A login → visit-every-nav-item → assert-no-error-boundary smoke test is the highest-value thing to add next, and it needs a running backend. Add it in a project, not in the template. |
| **No coverage threshold** | A number that must not go down encourages tests written to raise it. |

## 5. New module checklist

1. Does this module have a failure mode that is **silent**? If not, skip it.
2. If yes: `<module>.test.ts` beside the code.
3. Import with `.ts` extensions.
4. One comment per test naming the production consequence.
5. `npm test` before you call it done — CI runs it too.

## 6. How to re-check this doc

```bash
# The suite passes.
npm test
```

```bash
# Every test file imports only the built-in runner and the module under test.
# A third-party import here means the zero-dependency promise is gone.
grep -rhoE '^import .* from "[^"]+"|from "[^"]+";' $(find src -name "*.test.ts") \
  | grep -oE '"[^"]+"' | sort -u
```

```bash
# Test files are excluded from tsc (they use .ts specifiers it refuses).
grep -A6 '"exclude"' tsconfig.json
```
