# Testing

> Read this before you add a test, or decide something does not need one.
> Last verified against the code: 19 Aug 2026.

Guardrail: [`../../CLAUDE.md`](../../CLAUDE.md) §16.

---

## 1. What & why

Two layers, and the split between them is the only thing you really need to remember:

| Layer | Command | For |
|---|---|---|
| **Vitest** (jsdom) | `npm test` | Pure functions and component logic. Fast — the whole suite runs in about a second. |
| **Playwright** (real browser) | `npm run test:e2e` | The shared systems, end to end, on desktop **and** mobile viewports. |

**If an assertion depends on a real layout, a real animation, or a real navigation, jsdom
cannot see it and it belongs in Playwright.** jsdom has no layout engine — every element
reports as 0×0 — and runs no animations. A test asserting that a modal is a side panel on
desktop and a bottom sheet on mobile passes in jsdom whatever the code does.

That is not theoretical. Both real bugs found in this codebase were of exactly that shape:

- **The Modal never unmounted.** framer-motion's `onAnimationComplete` does not fire in this
  setup, so every panel slid out of view and then stayed in the DOM forever. jsdom runs no
  animation, so there was nothing to complete and nothing to catch.
- **The empty state flashed while a query retried.** A timing problem, over a real network
  round trip.

The Vitest layer's job is different: cover the modules whose failure mode is **silent** — a
wrong penny in a total, a date one day off, a discard prompt that never fires. None of those
throw. They are found by a customer, weeks later, and by then the wrong number is in a
document somebody acted on.

## 2. The rules

- Test files sit beside the code: `src/lib/numeric/numeric.test.ts`,
  `src/components/ui/modal.test.tsx`. Playwright specs live in `e2e/`.
- **Every test carries a comment naming what breaks in production if it fails.** A test whose
  purpose is unclear gets deleted the first time it is inconvenient.
- Vitest first. Reach for Playwright only when jsdom genuinely cannot answer the question.
- **In Playwright, query only visible elements.** `DataTable` renders both layouts into the
  DOM and lets CSS choose; the mobile cards come first, so a bare `.first()` resolves to a
  node that is hidden on desktop. Use `visibleText()` from `e2e/fixtures/helpers.ts`.
- The e2e suite must run with **no backend**. `e2e/fixtures/mock-api.mjs` stands in for one.
  A suite that needs a live API is a suite nobody runs.
- Do not add a third runner.

## 3. How it works here

| File | Responsibility |
|---|---|
| `vitest.config.ts` | jsdom, `@/` alias read from tsconfig, `e2e/` excluded. |
| `vitest.setup.ts` | jest-dom matchers, RTL cleanup, and stubs for `matchMedia` / `scrollIntoView` — jsdom implements neither, and both are read during render. |
| `playwright.config.ts` | Two projects (desktop, mobile). `webServer` starts the app **and** the mock API. |
| `e2e/fixtures/mock-api.mjs` | The handful of auth endpoints the suite touches. Not a mock framework — keep it small. |
| `e2e/fixtures/helpers.ts` | `signIn`, `goToList`, `visibleText`, `portalCount`. |
| `src/app/(dashboard)/dashboard/e2e-fixtures/` | The list + modal surface the suite drives. |

### Why there is a fixture route

The template ships no domains, so there is no real list page — and the shared systems are the
part most worth testing. The fixture page gives them somewhere to run.

It is gated on `NEXT_PUBLIC_E2E`, which Next inlines at build time: a production build
renders nothing there and ships none of the fixture code to the browser. It still answers
**200** with the not-found body rather than a real 404, because the segment is
`force-dynamic` and the response has begun streaming before `notFound()` runs. Nothing is
exposed, but it is not a security boundary — if you want the route gone, `node ncube.js
remove e2e` deletes it with the suite.

### What is covered

| Spec | Proves |
|---|---|
| `auth.spec.ts` | The redirect carries `?redirect=`, login reaches the dashboard, and **an authenticated call actually reaches the backend through the proxy** — the bug that shipped broken. |
| `list.spec.ts` | Search/sort write to the URL, a filtered list survives a reload, and the four display states are distinguishable. |
| `modal.spec.ts` | The dirty guard, and **that the portal leaves the DOM** after closing. |
| `responsive.spec.ts` | No horizontal page scroll, table↔cards, panel↔bottom sheet. |

## 4. Deliberately not done

| Not done | Why |
|---|---|
| **A third runner** | Vitest covers what `node:test` used to. Two module-resolution setups to keep in step with tsconfig is already one more than ideal. |
| **Coverage thresholds** | A number that must not go down encourages tests written to raise it. |
| **Mocking the API in Vitest** | If a test needs a network round trip it is asking a question jsdom cannot answer — that is the signal to write it in Playwright. |
| **Testing the animation itself** | The e2e tests assert the *outcome* (the portal is gone), not the frames. Asserting on timing makes a suite that fails on a slow CI box. |
| **Visual regression** | Worth having on a product with a design system. On a template it would fail on every legitimate change. |

## 5. New module checklist

1. Does anything here fail **silently**? Money, dates, parsing, comparison → a Vitest test.
2. Does anything depend on layout, animation or navigation? → a Playwright spec.
3. Component logic with branches worth pinning (a guard, a disabled state) → a Vitest
   component test with `@testing-library/react`.
4. One comment per test naming the production consequence.
5. `npm test` before you call it done. `npm run test:e2e` before you open a PR.

## 6. How to re-check this doc

```bash
# Both layers pass.
npm test && npm run test:e2e
```

```bash
# No third runner has crept in.
node -e "const d=require('./package.json').devDependencies; console.log(Object.keys(d).filter(k=>/jest|mocha|ava|karma|cypress/.test(k)).join(', ') || 'none')"
```

```bash
# Every test names its consequence: each file should carry a leading comment block.
for f in $(find src e2e -name "*.test.ts*" -o -name "*.spec.ts"); do
  head -5 "$f" | grep -q "^//" || echo "no rationale comment: $f"
done; echo done
```
