# PWA & Offline

> Read this before you add a service worker.
> Last verified against the code: 19 Aug 2026.

Guardrail: [`../../CLAUDE.md`](../../CLAUDE.md) §17.

---

## 1. What & why

The template ships **installable, not offline**. There is a manifest, there are icons, and
there is deliberately **no service worker**.

Those are two very different commitments. A manifest is pure declaration — the browser
reads it, offers "Install", and nothing about how the app runs changes. A service worker is
a caching proxy that sits in front of every request, persists across sessions, and keeps
running after the tab closes. In an app whose data sits behind a login, that is not a
performance tweak; it is a place where authenticated data gets written to disk.

So installability is on by default because it cannot hurt, and offline is a decision each
project makes with its eyes open.

## 2. The rules

If you add a service worker:

- **Never cache a response from `/api/v1/*`.** Cache Storage is unencrypted, on disk, and
  survives logout. One `NetworkFirst` rule over the API and a shared laptop leaks the last
  user's records to the next one.
- **Never cache an authenticated HTML page.** Same reason, and the shell will also outlive
  the session it was rendered for.
- **Cache the app shell and static assets only** — `/_next/static/*`, fonts, icons.
- **Clear all caches on logout.** `caches.keys()` → `caches.delete()`, in the same place
  the query cache is cleared.
- **Version the cache name and clean up old ones in `activate`.** A stale worker serving
  last month's JavaScript against this month's API is one of the hardest bugs to diagnose
  remotely, because it reproduces for one user and nobody else.
- **Give yourself a kill switch** — a worker that can `unregister()` itself on command.
  Without one, a bad deploy is stuck on every device that visited during it.
- Offline **writes** need a queue, conflict handling and an optimistic UI. That is an
  architecture, not a plugin. Do not start it by accident.

## 3. How it works here

| File | Responsibility |
|---|---|
| `src/app/manifest.ts` | Name, `start_url: /dashboard`, `display: standalone`, theme colours, the icon set. |
| `src/app/layout.tsx` | `metadata.manifest`, `appleWebApp`, `icons`, and the `viewport` export carrying `themeColor` and `viewportFit: "cover"`. |
| `public/icons/` | 192, 512, a full-bleed 512 **maskable**, and a 180 apple-touch-icon. |
| `scripts/generate-icons.mjs` | Regenerates the placeholders. Replace the icons with your brand and delete it. |

**Two details that are easy to get wrong.**

*Maskable icons are full bleed.* The launcher applies its own shape mask — circle, squircle,
rounded square — and crops whatever sticks out. If the icon has transparent corners, the
launcher's wallpaper shows through them. So the background covers the whole canvas and the
mark stays inside the **circular** safe zone: the middle 80% by diameter, not by width.
Without a maskable icon, Android puts your square icon inside a white circle.

*`start_url` is `/dashboard`, not `/`.* An installed app should open where the user works.
Unauthenticated, `proxy.ts` bounces them to `/login` anyway, so nothing is lost.

## 4. Deliberately not done

| Not done | Why |
|---|---|
| **A service worker** | §1 and §2. The safe configuration is subtle enough that a template shipping one ships that subtlety to every project, including the ones that never read this file. |
| **`next-pwa`** | Effectively unmaintained for the App Router. |
| **Serwist** | The live option, and a reasonable choice — but it is a dependency plus build config, for a capability most internal tools never use. Add it in a project. |
| **An install prompt UI** | `beforeinstallprompt` is Chromium-only and the browser's own prompt is usually better. Add a custom one only when you have a reason to control the timing. |
| **Push notifications** | Needs a service worker, a push service, VAPID keys and a backend that can send. Entirely project-shaped. |
| **Offline writes** | A sync queue and conflict resolution. See §2. |

## 5. New module checklist

Nothing per module — this is app-level. When a project decides it needs offline:

1. Read §2 in full before writing a line of the worker.
2. Add Serwist (or write the worker by hand — it is not much code for a static-asset cache).
3. Allowlist what may be cached. Do not write a denylist; a route added later would be
   cached by default, which is the wrong failure direction.
4. Clear caches in `useLogout`, beside `queryClient.clear()`.
5. Add a kill switch and test it before shipping.
6. Add a row to §3 of this file.

## 6. How to re-check this doc

```bash
# No service worker has appeared. Expect zero.
find public src -name "sw.js" -o -name "service-worker.js" -o -name "*serwist*"
grep -rn "serviceWorker" src/ || echo "none"
```

```bash
# The manifest still meets the installability bar: name, start_url, standalone
# display, a 192 and a 512 icon, and one maskable.
node -e "
const m = require('./src/app/manifest.ts');
" 2>/dev/null || npx next build >/dev/null 2>&1 && \
  echo "build the app and fetch /manifest.webmanifest to verify"
```

```bash
# Every icon the manifest names actually exists.
ls -la public/icons/
```
