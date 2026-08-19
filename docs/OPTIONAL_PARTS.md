# Optional parts

> Generated from the `REMOVABLE` manifest in `ncube.js`.
> Regenerate with `node ncube.js remove --write-docs`. Do not edit by hand.

A template ships things your project will not need. **Dead code is worse than absent
code** — it gets read, maintained, copied into new modules, and it makes every search
noisier. Take out what you are not using, early, while it is still easy.

```bash
node ncube.js remove --list          # what can go
node ncube.js remove <name> --dry-run  # what it would touch
node ncube.js remove <name>          # do it, then type-check
```

The command verifies every edit still matches the template **before** changing
anything. If you have modified one of the files it needs to touch, it stops and
changes nothing, telling you to finish by hand rather than half-applying the removal.

That check is a substring match, so it will not catch every possible edit — a comment
appended to the last matched line still matches. The real guarantee is the step after:
the command runs `tsc --noEmit` and prints the failures verbatim rather than claiming
success. To undo everything: `git checkout -- . && git clean -fd`.

**Commit before removing.** The command is designed to be revertible, and that only
works if there is something to revert to.

---

## `permissions` — Permissions / RBAC

Role-based gating of nav items and buttons.

**Remove when:** Your app has no roles, or a single role, and the backend gates everything.

**What still works:** Auth still works. Everyone who is signed in sees every nav item, and the backend remains the real guard.

| What | Action |
|---|---|
| `src/lib/permissions` | deleted |
| `docs/rules/06-permissions.md` | deleted (and its row in the rules index) |
| `src/app/(dashboard)/layout.tsx` | edited |
| `src/app/(dashboard)/config.ts` | edited |
| `src/app/(dashboard)/config.ts` | lines stripped |

---

## `numeric` — Decimal money & quantities (big.js)

String-based money and quantity maths, and their formatters.

**Remove when:** Your app shows no money, no decimals, and no quantities.

**What still works:** Everything else. Dates are a separate module and stay.

**Remove `e2e` first** — it depends on this one.

> ⚠️ The Intl.NumberFormat lint rules stay. If you now format numbers by hand, delete the two NumberFormat selectors in eslint.config.mjs — and read docs/rules/12 first, because the browser-locale trap they prevent is real either way.

| What | Action |
|---|---|
| `src/lib/numeric` | deleted |
| `eslint.config.mjs` | edited |
| `src/lib/utils.ts` | edited |
| `big.js` | dependency dropped |
| `@types/big.js` | dependency dropped |

---

## `reference` — Reference pickers

Ungated dropdown feeds and the shared <ReferencePicker>.

**Remove when:** Your backend has no /<resource>/options routes and you are not adding them.

**What still works:** <SearchableSelect> stays — it is the combobox underneath, and useful on its own.

> ⚠️ Read docs/rules/13 before removing this. The permission trap it exists to prevent — a dropdown fed from a gated module list, silently empty for the people who need it — comes back the moment you write your own picker.

| What | Action |
|---|---|
| `src/lib/reference` | deleted |
| `src/components/shared/reference-picker.tsx` | deleted |
| `docs/rules/13-reference-data.md` | deleted (and its row in the rules index) |
| `src/components/shared/index.ts` | edited |

---

## `blocking-loading` — Blocking loading overlay

useBlockingMutation and the full-screen overlay it drives.

**Remove when:** You prefer inline pending states on buttons to a global overlay.

**What still works:** Mutations still work. You handle pending state per component instead.

> ⚠️ Every generated mutation hook uses useBlockingMutation. After removing this, `ncube startdomain` output will not compile until you switch those to useMutation.

| What | Action |
|---|---|
| `src/lib/loading` | deleted |
| `src/components/loading` | deleted |
| `src/app/layout.tsx` | edited |
| `src/lib/auth/hooks.ts` | edited |

---

## `data-view` — DataView (the list system)

URL-synced search, filters, sort, pagination, row selection and bulk actions.

**Remove when:** Your app is not list-driven. Think hard: this is most of the template's value.

**What still works:** <DataTable> stays — you would render it yourself and own the state.

**Remove `e2e` first** — it depends on this one.

> ⚠️ Removing this means hand-rolling page/search/filter state, which docs/rules/07 exists to talk you out of. Read it first.

| What | Action |
|---|---|
| `src/components/data-view` | deleted |
| `docs/rules/07-list-pages.md` | deleted (and its row in the rules index) |

---

## `e2e` — End-to-end tests (Playwright)

The browser suite, its mock backend, and the fixture route the shared-system tests drive.

**Remove when:** You are not going to run a browser suite. Deleting it also removes the fixture route from your app entirely.

**What still works:** The Vitest layer stays — unit and component tests keep running with `npm test`.

> ⚠️ docs/rules/16-testing.md still describes two layers. Trim its Playwright half so the doc matches what you have.

| What | Action |
|---|---|
| `e2e` | deleted |
| `playwright.config.ts` | deleted |
| `src/app/(dashboard)/dashboard/e2e-fixtures` | deleted |
| `package.json` | edited |
| `@playwright/test` | dependency dropped |

---

## `dark-mode` — Dark mode

next-themes and the theme-aware toast surface.

**Remove when:** The product is light-only by design.

**What still works:** The .dark token block stays in globals.css — harmless, and it means re-adding dark mode later is one provider.

| What | Action |
|---|---|
| `src/app/layout.tsx` | edited |
| `src/components/ui/sonner.tsx` | edited |
| `next-themes` | dependency dropped |

---

## Adding a removable feature

Add an entry to `REMOVABLE` in `ncube.js` and run `node ncube.js remove --write-docs`.

Use **exact strings** in `edits`, never regex. A match that fails is a clean stop; a
regex that half-matches quietly mangles the file.
