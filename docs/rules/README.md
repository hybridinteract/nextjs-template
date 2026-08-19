# Rules — Index

> One rule per file, so this folder stays trackable as it grows.
> Every file carries its own `Last verified against the code` stamp.

A **rule** is a decision that applies across the whole app — how data crosses the wire, how
a list page is built, what a colour may be. Each file says what the rule is, how it works
here, **what was deliberately left undone and why**, and the commands that prove the file
still matches the code.

## The one-owner rule

**A rule file is the single owner of its rule.** Where the same rule appears elsewhere —
[`../../CLAUDE.md`](../../CLAUDE.md), the architecture guide, a README — it appears as a
*short summary that links here*, never as a second full statement.

- `CLAUDE.md` owns the **one-line guardrail** you read before every change.
- This folder owns **what is true now**, in full.
- The architecture guide owns the **narrative** — how the pieces fit together for someone
  meeting the codebase.

When a rule changes, **this folder is the file you edit.** That split exists because the
same contract restated in four places becomes four contracts that disagree.

## Read this before you are about to…

| Rule | Read it before you… |
|---|---|
| [`01-module-anatomy.md`](01-module-anatomy.md) | create any new folder under `src/` |
| [`02-wire-format.md`](02-wire-format.md) | add a field that comes from or goes to the backend |
| [`03-api-layer.md`](03-api-layer.md) | make an HTTP call, or change how one is authenticated |
| [`04-data-fetching.md`](04-data-fetching.md) | add a query, change a `staleTime`, or debug stale data |
| [`05-mutations-and-toasts.md`](05-mutations-and-toasts.md) | add a write, or make anything say "Saved" |
| [`06-permissions.md`](06-permissions.md) | add a button not everyone should see |
| [`07-list-pages.md`](07-list-pages.md) | build any page that shows rows |
| [`08-components-and-routing.md`](08-components-and-routing.md) | add a page, a route, or a dialog |
| [`09-forms-and-unsaved-work.md`](09-forms-and-unsaved-work.md) | add a form, or a modal holding typed input |
| [`10-styling.md`](10-styling.md) | write a colour |
| [`11-typescript.md`](11-typescript.md) | reach for `any`, or write a type by hand |
| [`12-dates-and-numbers.md`](12-dates-and-numbers.md) | render a date or a number a user will read |
| [`13-reference-data.md`](13-reference-data.md) | add a dropdown, a filter, or a column showing another module's name |
| [`14-files-and-downloads.md`](14-files-and-downloads.md) | make the browser save something |
| [`15-errors-and-boundaries.md`](15-errors-and-boundaries.md) | handle a failure |
| [`16-testing.md`](16-testing.md) | add a test, or decide something does not need one |

## Adding a rule

Copy [`_TEMPLATE.md`](_TEMPLATE.md), take the next free number, and add a row above. Keep
all six sections — the shape is what makes these comparable, and section 4 ("Deliberately
not done") is what stops the next person undoing a decision on purpose.

**The bar for a new file:** a rule earns one when getting it wrong has a consequence you can
describe concretely, and the answer is not obvious from reading the code. If it is just
"here is how this library works", link to that library instead.

## Keeping them honest

Every file ends with **How to re-check this doc** — the literal commands that rebuild its
claims. Run them when you touch the topic. If a command disagrees with the file, the file is
stale: fix it and update the date at the top.

That section is the only defence these documents have against quiet rot. A rules folder
nobody verifies is worse than none, because people trust it.
