# Dates and times

Guide to `src/lib/date-utils.ts` and `src/lib/timezone.ts`. Read this before you render any
date, or reach for `new Date(...)`.

---

## Two kinds of value, formatted differently

| What you have | Looks like | Use | Timezone |
| --- | --- | --- | --- |
| **Instant** (`*_at`) | `2026-07-14T21:00:00Z` | `formatDate` / `formatDateTime` / `formatTime` | Needs one — pass `{ timeZone }` |
| **Business date** (`*_date`) | `2026-07-15` | `formatBusinessDate` | **None** — it is a calendar day |

An instant is a point on the world's timeline; which day and time it reads as depends on
the zone. A business date is a square on a paper calendar — it has no time and no zone,
and running it through a zone is how you corrupt it.

### The off-by-one this prevents

`new Date("2026-07-15")` parses as **UTC midnight**. Render that in any negative-offset
zone and you get **14 Jul** — the day before the one stored. `formatBusinessDate` reads
the `YYYY-MM-DD` parts literally and never builds a zoned instant, so it shows
`15 Jul 2026` in Dubai, London and New York alike.

## Output format is fixed: `14 Jul 2026`

Day · short-month · year, assembled from `Intl` parts so it cannot drift with the
runtime's locale. Deliberately **not** locale-driven: `07/08/2026` means 7 August to a
Brit and 8 July to an American, and no app operating in more than one country can afford
that. There is no `locale` argument — do not add one.

## Choosing the timezone

Never hardcode a zone at a call site. Two hooks resolve it:

```ts
const tz = useDisplayTimeZone();               // instants — what the viewer sees
formatDateTime(row.createdAt, { timeZone: tz });

const businessTz = useBusinessTimeZone();      // business-date inputs
const [date, setDate] = useState(todayString(businessTz));   // <input type="date">
```

- **`useDisplayTimeZone()`** — user preference → `"auto"` (their device) → `DEFAULT_TIME_ZONE`.
  Backed by `AuthUser.timezonePreference`, which is optional: if your backend does not offer
  the setting, this falls back to the default and everything still works.
  **Display only.** It must never decide a value you send to the server.
- **`useBusinessTimeZone()`** — the zone new records book on. Today it returns the app
  default. It is a hook rather than a constant because it is the seam: a multi-branch app
  resolves it from the active branch, and no call site changes.

Omitting `timeZone` falls back to `DEFAULT_TIME_ZONE`, which is fine for module-level
helpers that cannot call hooks. Prefer passing the resolved zone in components.

Set `DEFAULT_TIME_ZONE` in `src/lib/date-utils.ts`. It ships as `"UTC"`.

## The ESLint guard

`eslint.config.mjs` makes these **errors** outside `date-utils.ts`:

- `.toLocaleDateString()` / `.toLocaleString()` / `.toLocaleTimeString()` — these follow
  the viewer's browser locale *and* zone, so the same record renders differently on
  different machines.
- `new Date().toISOString().slice(0, 10)` — that is the **UTC** day, off-by-one west of
  UTC. Use `todayString(tz)` / `toDateString(value, tz)`.

Only ESLint catches these. `tsc` will not, so run lint when you touch dates.

## Adding a date to a UI

1. Business date (`*_date` from the backend) → `formatBusinessDate(value)`. No hook, no zone.
2. Instant (`*_at`) → `formatDateTime(value, { timeZone: useDisplayTimeZone() })`.
3. Prefilling a date input → `todayString(useBusinessTimeZone())`.
4. Never `new Date(x).toLocale*()`; never a raw `Intl.DateTimeFormat` at a call site.

## Numbers follow the same rule

`src/lib/numeric` exists for the same reason: `Intl.NumberFormat(undefined, …)` follows the
viewer's device, so a German browser renders `1234.5` as `1.234,5` and the same invoice
reads as a different amount. Use `formatMoney` / `formatQuantity`, and never do float math
on a money string — `0.1 + 0.2` is `0.30000000000000004`.
