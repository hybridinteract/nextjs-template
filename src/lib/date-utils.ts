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
// docs/rules/12-dates-and-numbers.md.

/**
 * The app's default timezone. Fallback when no user zone is resolved.
 *
 * **India, because every project built on this template so far is Indian.** Unless
 * the backend sends a zone for each user, this is the zone for everybody. Influen
 * inherited "UTC" here and every time on screen read 5.5 hours behind: an account
 * created at 10:44 showed as 05:14. It also decides which calendar day a new
 * record books on, through `useBusinessTimeZone()`.
 *
 * Change it for a project outside India. Don't fall back to the device's zone
 * instead: the server render and the browser disagree, and every screen that shows
 * a time gets a hydration mismatch.
 */
export const DEFAULT_TIME_ZONE = "Asia/Kolkata";

const EMPTY = "—";

export interface DateFormatOptions {
  /** IANA zone to render an instant in. Defaults to {@link DEFAULT_TIME_ZONE}. */
  timeZone?: string;
}

export interface DateTimeFormatOptions extends DateFormatOptions {
  /**
   * 12-hour clock with AM/PM. **Default true**, because India reads the clock in
   * twelve hours and no call site passes this option, so the default is what every
   * screen shows. Pass `false` for a screen that really wants "15:04".
   */
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

// Newer ICU spells September "Sept" in en-GB, and only September. Cutting every
// short month to three letters keeps one month in twelve from changing shape
// when the runtime updates.
function shortMonth(month: string): string {
  return month.slice(0, 3);
}

function dateStr(d: Date, timeZone: string): string {
  const p = parts(d, timeZone, { day: "2-digit", month: "short", year: "numeric" });
  return `${p.day} ${shortMonth(p.month)} ${p.year}`;
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

/** An instant's date + time in `timeZone` → "14 Jul 2026, 3:04 PM" (or "15:04" with `hour12: false`). */
export function formatDateTime(
  value: string | Date | null | undefined,
  { timeZone = DEFAULT_TIME_ZONE, hour12 = true }: DateTimeFormatOptions = {},
): string {
  const d = toDate(value);
  return d ? `${dateStr(d, timeZone)}, ${timeStr(d, timeZone, hour12)}` : EMPTY;
}

/** An instant's time-of-day in `timeZone` → "3:04 PM" (or "15:04" with `hour12: false`). */
export function formatTime(
  value: string | Date | null | undefined,
  { timeZone = DEFAULT_TIME_ZONE, hour12 = true }: DateTimeFormatOptions = {},
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

/**
 * How long until a deadline, and how much of it is left.
 *
 * **The number comes back beside the words** rather than a colour, because the
 * threshold that makes something urgent belongs to the screen and not to this
 * module. One list turns the last day amber, another may not care.
 *
 * `hoursLeft` is a whole number and clamps at zero, so a caller never has to
 * check `expired` and the sign as two separate things.
 */
export function formatTimeLeft(value: string | Date | null | undefined): {
  text: string;
  expired: boolean;
  hoursLeft: number;
} {
  const d = toDate(value);
  if (!d) return { text: EMPTY, expired: false, hoursLeft: 0 };

  const secs = Math.floor((d.getTime() - Date.now()) / 1000);
  if (secs <= 0) return { text: "Expired", expired: true, hoursLeft: 0 };

  const mins = Math.floor(secs / 60);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  const hoursLeft = hours;

  if (mins < 1) return { text: "Under a minute left", expired: false, hoursLeft };
  if (mins < 60) return { text: `${plural(mins, "minute")} left`, expired: false, hoursLeft };
  if (hours < 24) return { text: `${plural(hours, "hour")} left`, expired: false, hoursLeft };
  return { text: `${plural(days, "day")} left`, expired: false, hoursLeft };
}

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? "" : "s"}`;
}

/**
 * A short countdown as a clock face: 900 → "15:00", 61 → "1:01", 0 → "0:00".
 *
 * For a timer somebody is watching tick, like a verification code's expiry or a
 * resend wait. `formatTimeLeft` is the one for a deadline hours or days off.
 * Takes whole seconds and clamps below zero, so a tick that lands a hair after
 * the deadline reads "0:00" rather than "-1:59".
 */
export function formatCountdown(secondsLeft: number): string {
  const safe = Math.max(0, Math.floor(secondsLeft));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// ── Business-date formatters (calendar days — no timezone shift) ─────────────────

/**
 * A date-only business value ("2026-07-15", or the date part of an ISO string) →
 * "15 Jul 2026". Never shifts the day: the y/m/d are read literally and rendered
 * in UTC, so the output is identical in every viewer timezone.
 */
export function formatBusinessDate(value: string | null | undefined): string {
  const d = parseBusinessDate(value);
  return d ? dateStr(d, "UTC") : EMPTY;
}

/**
 * A business date without its year → "25 Sep". Only where the year is plain
 * from around it: "Next: Harish Gowda, 25 Sep", "24 Sep – 07 Oct".
 */
export function formatBusinessDayMonth(value: string | null | undefined): string {
  const d = parseBusinessDate(value);
  if (!d) return EMPTY;
  const p = parts(d, "UTC", { day: "2-digit", month: "short" });
  return `${p.day} ${shortMonth(p.month)}`;
}

/** A business date written out → "Thursday, 24 September". For a heading or a greeting. */
export function formatBusinessDateLong(value: string | null | undefined): string {
  const d = parseBusinessDate(value);
  if (!d) return EMPTY;
  const p = parts(d, "UTC", { weekday: "long", day: "numeric", month: "long" });
  return `${p.weekday}, ${p.day} ${p.month}`;
}

// The y/m/d read literally, as UTC midnight, so no viewer's zone can shift the day.
function parseBusinessDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? null : d;
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

// ── Wall clock ⇄ instant, in an explicit zone ────────────────────────────────
//
// The two functions below are each other's inverse and they exist for one
// control: `<input type="datetime-local">`. That input has **no timezone at
// all** — it hands back "2026-09-08T14:30" and the browser expects you to
// decide what that means. `new Date("2026-09-08T14:30")` decides it means the
// *device's* zone, which is the one thing this file rules out everywhere else:
// the server pass and the browser disagree, and the value then reads back five
// and a half hours out against `DEFAULT_TIME_ZONE`.
//
// So a typed wall time is read in the same zone the screen renders in. Somebody
// types a time, sees it echoed back unchanged, and the instant stored is the one
// they meant.

/**
 * How far ahead of UTC `timeZone` is at `instant`, in milliseconds.
 *
 * Read the wall clock the zone shows at that instant, then re-read those digits
 * as if they were UTC. The gap between the two is the offset. `Intl` gives the
 * forward direction only, which is why the inverse below has to iterate.
 */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const p = parts(instant, timeZone, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  // `hour: "2-digit"` with `hour12: false` renders midnight as "24" on some
  // engines. `% 24` is the documented way round it and is a no-op elsewhere.
  const asUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour) % 24,
    Number(p.minute),
    Number(p.second),
  );
  return asUtc - instant.getTime();
}

/**
 * A `datetime-local` value read as wall-clock time in `timeZone` → an ISO
 * instant. Returns null on anything that is not "YYYY-MM-DDTHH:mm".
 *
 * Two passes, and the second is not superstition: the first guess can land on
 * the far side of a daylight-saving change from the answer, where the offset is
 * different. `Asia/Kolkata` has no DST and needs one pass, but this is not the
 * place to encode that.
 */
export function instantFromZonedInput(
  local: string,
  timeZone: string = DEFAULT_TIME_ZONE,
): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match;
  const wallAsUtc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
  );

  let instant = wallAsUtc - zoneOffsetMs(new Date(wallAsUtc), timeZone);
  instant = wallAsUtc - zoneOffsetMs(new Date(instant), timeZone);

  const result = new Date(instant);
  return Number.isNaN(result.getTime()) ? null : result.toISOString();
}

/** An instant → the "YYYY-MM-DDTHH:mm" a `datetime-local` input wants, in `timeZone`. */
export function zonedInputValue(
  value: string | Date | null | undefined,
  timeZone: string = DEFAULT_TIME_ZONE,
): string {
  const d = toDate(value);
  if (!d) return "";
  const p = parts(d, timeZone, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${p.year}-${p.month}-${p.day}T${String(Number(p.hour) % 24).padStart(2, "0")}:${p.minute}`;
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
