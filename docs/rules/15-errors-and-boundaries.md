# Errors, Boundaries & Session Expiry

> Read this before you handle a failure, or wonder what a user sees when something breaks.
> Last verified against the code: 19 Aug 2026.

Guardrail: [`../../CLAUDE.md`](../../CLAUDE.md) §15.

---

## 1. What & why

Three different failures need three different answers, and the common mistake is giving
them all the same one:

- **A request failed.** The page still works. Show it where the data would have been.
- **A component threw.** That page is gone; the rest of the app is fine. Keep the shell.
- **The session ended.** Nothing will work again until they sign in. Say so, and let them
  copy what they had first.

An app with no error boundary answers all three with a white screen.

## 2. The rules

- Every list surfaces its query error through `<DataView error onRetry>`. See
  [`07-list-pages.md`](07-list-pages.md).
- Mutation errors go through the module's `handleError` → `toast.error`. See
  [`05-mutations-and-toasts.md`](05-mutations-and-toasts.md).
- Errors from the API are `AppError` with `.statusCode` and `.message`. Narrow with
  `err instanceof AppError`, never with a string match on the message.
- Do not delete the four boundary files. Each covers a different blast radius.
- Log through `logger` (`@/lib/utilities`), never a bare `console.error`.
- **Never navigate away because a request failed.** Raise the session flag and let the
  dialog ask.

## 3. How it works here

| File | Catches | Keeps working |
|---|---|---|
| `src/app/(dashboard)/dashboard/error.tsx` | A throw inside one dashboard page | The sidebar and top bar — the user can navigate away |
| `src/app/error.tsx` | A throw anywhere else under the root layout | The document; offers a retry |
| `src/app/global-error.tsx` | A throw in the root layout itself | Nothing — it renders its own `<html>`, with inline styles, because the layout that would provide them is what failed |
| `src/app/not-found.tsx` | An unmatched route | Everything |

Order matters: the **innermost** boundary wins, which is why the dashboard one exists. The
root `error.tsx` would replace the whole screen and strand the user on a dead page.

`error.digest` is surfaced in the UI on purpose. In production the client-side stack is
stripped, so the digest is the only handle that ties a user's report to a server log line.

### Session expiry

`apiClient` raises a flag; it does not navigate.

```
refresh fails → useSessionStore.markExpired(currentPath)
              → <SessionExpiredDialog> opens
              → user clicks "Sign in again"
              → queryClient.clear() + push /login?redirect=<path>
```

The old behaviour was `window.location.href = "/login"`, straight from the api-client. That
is a navigation, so anything typed and unsaved went with it — on a long form, minutes of
work, with no warning. Nothing *could* warn: the decision was made three layers below the
form. The dialog has no cancel button, because nothing on the page will load any more and
offering to stay would be a lie; what it buys is a beat to copy what is on screen.

Repeat notifications are ignored — six queries in flight report the same dead session six
times, and the first one already told the truth.

## 4. Deliberately not done

| Not done | Why |
|---|---|
| **No global React Query `onError`** | The useful message is domain-specific. A generic "Request failed" toast trains people to ignore toasts. |
| **No error reporting service wired up** | `logger` is the seam. Point it at Sentry or Datadog in one file, without touching a call site. |
| **The session dialog has no "stay on this page" option** | Nothing will load. A dismissible dialog would make a dead app look alive. |
| **`error.tsx` does not retry automatically** | The user presses the button. An automatic retry loop on a deterministic render error spins forever. |

## 5. New module checklist

1. Thread `error` and `onRetry` from the list hook into `<DataView>`.
2. One `handleError` per module; every mutation uses it.
3. Narrow with `instanceof AppError`.
4. `logger.error` for anything worth knowing about, never `console`.

## 6. How to re-check this doc

```bash
# The four boundaries exist.
ls src/app/error.tsx src/app/global-error.tsx src/app/not-found.tsx "src/app/(dashboard)/dashboard/error.tsx"
```

```bash
# Bare console calls in app code. Expect only lib/utilities/logger.ts.
grep -rn "console\.\(log\|error\|warn\)" src/ | grep -v "src/lib/utilities/logger.ts"
```

```bash
# Navigation on failure. Expect zero — the session store handles it.
# Assignment only, comments stripped: reading `location.href` to build a URL is
# fine, and session-store.ts quotes the old bad line in its docstring.
grep -rnE "location\.href\s*=" src/ | grep -vE ":\s*\*|//
```

```bash
# Routes missing a loading.tsx beside their page.tsx.
for p in $(find "src/app/(dashboard)" -name page.tsx); do
  [ -f "$(dirname "$p")/loading.tsx" ] || echo "no loading.tsx: $p"
done
```
