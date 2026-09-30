# Dates, Times & Numbers

> Read this before you render a date or a number a user will read.
> Last verified against the code: 30 Sep 2026.

Guardrail: [`../../CLAUDE.md`](../../CLAUDE.md) §12.

---

## 1. What & why

All date and time formatting goes through `@/lib/date-utils`. All money and quantity
formatting goes through `@/lib/numeric`. Neither may be bypassed, and ESLint enforces it.

Both exist to stop the same class of bug: **the same record reading differently on
different machines.** `toLocaleDateString()` follows the viewer's browser locale *and*
timezone. `Intl.NumberFormat(undefined, …)` follows their locale. So an invoice for
`1234.5` reads as `1,234.50` in London and `1.234,50` in Berlin, and a date of `07/08/2026`
means 7 August to one of them and 8 July to the other. Nothing throws. Someone just acts on
the wrong number.

## 2. The rules

### Dates

- Never `toLocaleDateString()` / `toLocaleString()` / `toLocaleTimeString()`.
- Never `new Date(ymd)` on a `YYYY-MM-DD` business date — it parses as UTC midnight and
  shifts to the previous day west of UTC.
- Never `new Date().toISOString().slice(0, 10)` — that is the UTC day, not the local one.
- Instants (`*_at`) take a `timeZone`, from `useDisplayTimeZone()`.
- Business dates (`*_date`) take none — use `formatBusinessDate`.
- Prefill a date input with `todayString(useBusinessTimeZone())`.
- Never `new Date(value)` on a `datetime-local` input. Read it with
  `instantFromZonedInput(value, timeZone)`, fill it with `zonedInputValue(instant, timeZone)`.

### Numbers

- Money and quantities are **decimal strings** on the wire and stay strings.
- All arithmetic goes through `big.js` via `@/lib/numeric`. Never `+` on a money value.
- Never construct `Intl.NumberFormat` at a call site.
- Render quantities with `formatQuantity` — a raw wire string shows `1990.000`.
- Seed an editable `type="number"` input with `toBig(x).toString()`, not `formatQuantity`
  (its grouping injects commas the input rejects).

## 3. How it works here

### Two kinds of date value

| What you have | Looks like | Use | Timezone |
| --- | --- | --- | --- |
| **Instant** (`*_at`) | `2026-07-14T21:00:00Z` | `formatDate` / `formatDateTime` / `formatTime` | Needs one |
| **Business date** (`*_date`) | `2026-07-15` | `formatBusinessDate`, or `formatBusinessDayMonth` ("15 Jul") and `formatBusinessDateLong` ("Wednesday, 15 July") | **None** |

An instant is a point on the world's timeline; which day it reads as depends on the zone. A
business date is a square on a paper calendar — no time, no zone. Running it through a zone
is how you corrupt it.

Output is fixed at `14 Jul 2026`, assembled from `Intl` parts so it cannot drift with the
runtime's locale. There is deliberately **no `locale` argument** — a named month cannot be
misread as mm/dd/yyyy.

```ts
const tz = useDisplayTimeZone();
formatDateTime(row.createdAt, { timeZone: tz });   // "14 Jul 2026, 9:00 PM"
formatBusinessDate(row.dueDate);                   // "15 Jul 2026", everywhere
```

### Choosing the zone

- **`useDisplayTimeZone()`** — user preference → `"auto"` (their device) → `DEFAULT_TIME_ZONE`.
  Backed by the optional `AuthUser.timezonePreference`. **Display only** — it must never
  decide a value you send to the server.
- **`useBusinessTimeZone()`** — the zone new records book on. A hook rather than a constant
  because it is the seam: a multi-branch app resolves it from the active branch and no call
  site changes.

`DEFAULT_TIME_ZONE` ships as `"Asia/Kolkata"`, because every project on this template so
far is Indian. Unless the backend sends a zone for each user, this default is the zone for
everybody. Influen inherited `"UTC"` and every time on screen read 5.5 hours behind. For a
project outside India, change it once in `src/lib/date-utils.ts`.

Times are **12-hour by default** ("9:00 PM"). No call site passes `hour12`, so the default
is what every screen shows. Pass `hour12: false` where a screen really wants "21:00".

### Deadlines, countdowns and typed times

| Function | Gives | For |
|---|---|---|
| `formatTimeLeft(deadline)` | `{ text: "3 days left", expired, hoursLeft }` | A deadline hours or days off. The screen decides what counts as urgent from `hoursLeft`. |
| `formatCountdown(seconds)` | `"15:00"`, `"0:09"` | A timer someone watches tick, like a code's expiry. Never goes below `0:00`. |
| `instantFromZonedInput(value, tz)` | `"2026-09-08T09:00:00.000Z"` | Reading a `datetime-local` input. |
| `zonedInputValue(instant, tz)` | `"2026-09-08T14:30"` | Filling a `datetime-local` input. |

A `datetime-local` input has no zone. It hands back "2026-09-08T14:30", and
`new Date()` reads that in the device's zone. The pair above reads and writes it in the
zone the screen renders in, so the time someone types is the time that gets stored. It
takes two passes, so a daylight-saving change can't put it an hour out.

The short month is always three letters. Newer ICU spells September "Sept" in `en-GB`, so
`date-utils` cuts every month to three to keep the format fixed.

### Numbers

| File | Responsibility |
|---|---|
| `numeric/decimal.ts` | `toBig`, `NUMBER_LOCALE`, the `MoneyString` / `QuantityString` types. |
| `numeric/money.ts` | 2 dp. `DEFAULT_CURRENCY`, `quantizeMoney`, `lineTotal`, `taxAmount`, `sumMoney`, `formatMoney`, `formatMoneyShort`. |
| `numeric/quantity.ts` | 3 dp. `quantizeQuantity`, `isPositiveQuantity`, `formatQuantity`. |

`NUMBER_LOCALE` is pinned to `en-IN`, so amounts group in lakhs and crores: ₹12,75,000.00,
not ₹1,275,000.00. Both Influen and Herbally IP switched to it by hand from the old `en-GB`.
Change it once, there, if your app's numbers should read differently. Do not add a
per-call-site locale argument — that is how the split comes back.

`DEFAULT_CURRENCY` is `"INR"`. Pass it to `formatMoney` when the record carries no currency
of its own, so the code never spells "INR" in forty places. When the backend sends a
currency with each row, pass that instead. Leaving the currency out gives a plain grouped
number, on purpose.

`formatMoneyShort` gives the short Indian form for a tile with no room: ₹8.21L, ₹1.25Cr,
and every rupee under a lakh (₹95,453). It is rupees only, whatever `DEFAULT_CURRENCY`
says, because lakh and crore mean nothing in another currency. Never use it on a bill or a
ledger, where every rupee has to show.

Rounding is **half up**, matching a typical backend `quantize_money`. Quantities are stored
at 3 dp, so the padding is storage, not information.

## 4. Deliberately not done

| Not done | Why |
|---|---|
| **No date library (date-fns, dayjs, luxon)** | `Intl` does the formatting, and the app needs almost no date *maths*. A library here is 20 kB for `addDays`. |
| **No `toFixed()` ban in ESLint** | It was tried and reverted upstream: it flags percentages, file sizes and animation values — all legitimate, none of them money. Scope a rule to a specific module if one ever needs it. |
| **`Intl` is allowed inside `date-utils.ts` and `lib/numeric`** | They are the implementation. The lint rule ignores exactly those paths. |
| **No currency stored per-value** | `formatMoney(value, "USD")` takes the code at the call site. Where a record carries its own currency, pass it through; the module owns that decision, not the formatter. |

## 5. New module checklist

1. Money and quantity fields are `string` in both the wire and the domain type.
2. Every timestamp rendered in a component gets `{ timeZone: useDisplayTimeZone() }`.
3. Every `*_date` field uses `formatBusinessDate`.
4. Every quantity rendered uses `formatQuantity`.
5. Any total is computed with `sumMoney` / `lineTotal`, never with `+`.
6. Run `npm run lint` — only ESLint catches these; `tsc` will not.

## 6. How to re-check this doc

```bash
# The banned calls. Expect zero hits outside the two implementation modules.
npm run lint 2>&1 | grep -c "no-restricted-syntax"
```

```bash
# Float math on a money field. Read each hit.
grep -rnE "(total|amount|price|cost|qty|quantity)[A-Za-z]* *[-+*/]=?" src/ --include="*.tsx"
```

```bash
# The unit tests covering both modules. Expect all passing.
npm test 2>&1 | tail -5
```
