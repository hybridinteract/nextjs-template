// Centralised date & time formatting — no external dependencies.
//
// There are TWO kinds of value here, and they are formatted differently:
//
//   • INSTANTS  ("*_at", ISO timestamps like "2026-07-15T21:00:00Z") — a point on
//     the world timeline, stored in UTC. WHICH wall-clock day/time they read as
//     depends on a timezone, so the instant formatters REQUIRE a `timeZone`
//     (defaulting to the app default). Get the right zone from
//     `useDisplayTimeZone()` (see ./timezone).
//
//   • BUSINESS DATES ("*_date", date-only strings like "2026-07-15") — a square on
//     a paper calendar. They have NO time and NO zone; formatting them must never
//     run them through `new Date(str)` (that parses as UTC midnight and shifts to
//     the previous day west of UTC). Use `formatBusinessDate`.
//
// Output format is fixed and locale-independent: "14 Jul 2026" (day · short-month ·
// year), so it can never be misread as US mm/dd/yyyy. See ./timezone and
// docs `date-and-time.md`.

/** The app's default timezone. Fallback when no user zone is resolved. */
export const DEFAULT_TIME_ZONE = "UTC";

const EMPTY = "—";

export interface DateFormatOptions {
  /** IANA zone to render an instant in. Defaults to {@link DEFAULT_TIME_ZONE}. */
  timeZone?: string;
}

export interface DateTimeFormatOptions extends DateFormatOptions {
  /** 12-hour clock with AM/PM. Default false (24-hour). */
  hour12?: boolean;
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Build a type→value map of formatted parts. Assembling the string ourselves
 * (rather than trusting a locale's punctuation) guarantees the exact
 * "14 Jul 2026" shape on every runtime.
 */
function parts(
  d: Date,
  timeZone: string,
  opts: Intl.DateTimeFormatOptions,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat("en-GB", { timeZone, ...opts }).formatToParts(d)) {
    out[p.type] = p.value;
  }
  return out;
}

function dateStr(d: Date, timeZone: string): string {
  const p = parts(d, timeZone, { day: "2-digit", month: "short", year: "numeric" });
  return `${p.day} ${p.month} ${p.year}`;
}

function timeStr(d: Date, timeZone: string, hour12: boolean): string {
  // 24h keeps a leading zero ("09:05"); 12h reads naturally ("9:05 AM").
  const p = parts(d, timeZone, { hour: hour12 ? "numeric" : "2-digit", minute: "2-digit", hour12 });
  const hm = `${p.hour}:${p.minute}`;
  return hour12 && p.dayPeriod ? `${hm} ${p.dayPeriod.toUpperCase()}` : hm;
}

// ── Instant formatters (need a display timezone) ────────────────────────────────

/** An instant's date in `timeZone` → "14 Jul 2026". */
export function formatDate(
  value: string | Date | null | undefined,
  { timeZone = DEFAULT_TIME_ZONE }: DateFormatOptions = {},
): string {
  const d = toDate(value);
  return d ? dateStr(d, timeZone) : EMPTY;
}

/** An instant's date + time in `timeZone` → "14 Jul 2026, 15:04" (or 12h with AM/PM). */
export function formatDateTime(
  value: string | Date | null | undefined,
  { timeZone = DEFAULT_TIME_ZONE, hour12 = false }: DateTimeFormatOptions = {},
): string {
  const d = toDate(value);
  return d ? `${dateStr(d, timeZone)}, ${timeStr(d, timeZone, hour12)}` : EMPTY;
}

/** An instant's time-of-day in `timeZone` → "15:04" (or "3:04 PM" with hour12). */
export function formatTime(
  value: string | Date | null | undefined,
  { timeZone = DEFAULT_TIME_ZONE, hour12 = false }: DateTimeFormatOptions = {},
): string {
  const d = toDate(value);
  return d ? timeStr(d, timeZone, hour12) : EMPTY;
}

/** Relative age of an instant ("5m ago"). Zone-independent — it is a difference. */
export function formatRelative(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return EMPTY;

  const diffSecs = Math.floor((Date.now() - d.getTime()) / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(d);
}

// ── Business-date formatters (calendar days — no timezone shift) ─────────────────

/**
 * A date-only business value ("2026-07-15", or the date part of an ISO string) →
 * "15 Jul 2026". Never shifts the day: the y/m/d are read literally and rendered
 * in UTC, so the output is identical in every viewer timezone.
 */
export function formatBusinessDate(value: string | null | undefined): string {
  if (!value) return EMPTY;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return EMPTY;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? EMPTY : dateStr(d, "UTC");
}

/** Today as "YYYY-MM-DD" on `timeZone`'s calendar — for prefilling `<input type="date">`. */
export function todayString(timeZone: string = DEFAULT_TIME_ZONE): string {
  return toDateString(new Date(), timeZone);
}

/** An instant's calendar day in `timeZone` as "YYYY-MM-DD" (en-CA yields ISO order). */
export function toDateString(
  date: Date | string,
  timeZone: string = DEFAULT_TIME_ZONE,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

// ── Date math (operate on Date objects; used for range filters) ──────────────────

export function addDays(date: Date | string, days: number): Date {
  const d = typeof date === "string" ? new Date(date) : new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function startOfDay(date: Date | string): Date {
  const d = typeof date === "string" ? new Date(date) : new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date | string): Date {
  const d = typeof date === "string" ? new Date(date) : new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}
