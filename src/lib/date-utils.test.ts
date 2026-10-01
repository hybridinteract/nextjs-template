import { test, expect } from "vitest";
import {
  DEFAULT_TIME_ZONE,
  formatBusinessDate,
  formatBusinessDateLong,
  formatBusinessDayMonth,
  formatCountdown,
  formatDate,
  formatDateTime,
  formatTime,
  formatTimeLeft,
  instantFromZonedInput,
  toDateString,
  zonedInputValue,
} from "./date-utils";

// The two bugs this module exists to prevent are both off-by-one-day, and both
// are invisible until a customer in the wrong timezone reads a date.

test("a business date never shifts, whatever the viewer's zone", () => {
  // new Date("2026-07-15") parses as UTC midnight and renders as 14 Jul west of
  // UTC. This must not.
  expect(formatBusinessDate("2026-07-15")).toBe("15 Jul 2026");
  expect(formatBusinessDate("2026-01-01")).toBe("01 Jan 2026");
  expect(formatBusinessDate("2026-12-31")).toBe("31 Dec 2026");
});

test("September is three letters, like every other month", () => {
  // Newer ICU spells September "Sept" in en-GB, and only September. A runtime
  // update would then change one month in twelve: "05 Sept 2026" beside
  // "05 Jun 2026". Herbally IP caught it.
  expect(formatBusinessDate("2026-09-05")).toBe("05 Sep 2026");
  expect(formatDate("2026-09-05T06:00:00Z", { timeZone: "UTC" })).toBe("05 Sep 2026");
});

test("a business date accepts a full ISO string and ignores the time", () => {
  expect(formatBusinessDate("2026-07-15T23:30:00Z")).toBe("15 Jul 2026");
});

test("the output can never be read as US mm/dd/yyyy", () => {
  // 07/08 is 7 August to a Brit and 8 July to an American. A named month cannot
  // be misread, which is why the format is fixed.
  expect(formatBusinessDate("2026-08-07")).toBe("07 Aug 2026");
});

test("an instant renders in the zone it is given", () => {
  const instant = "2026-07-14T21:00:00Z";
  expect(formatDate(instant, { timeZone: "UTC" })).toBe("14 Jul 2026");
  // Dubai is UTC+4, so 21:00Z is already the next day there.
  expect(formatDate(instant, { timeZone: "Asia/Dubai" })).toBe("15 Jul 2026");
  // New York is behind, so it is still the 14th.
  expect(formatDate(instant, { timeZone: "America/New_York" })).toBe("14 Jul 2026");
});

test("times render 12-hour by default and 24-hour on request", () => {
  // No call site passes `hour12`, so the default is what every screen shows.
  const instant = "2026-07-14T15:04:00Z";
  expect(formatTime(instant, { timeZone: "UTC" })).toBe("3:04 PM");
  expect(formatTime(instant, { timeZone: "UTC", hour12: false })).toBe("15:04");
  expect(formatDateTime(instant, { timeZone: "UTC" })).toBe("14 Jul 2026, 3:04 PM");
});

test("with no zone given, an instant renders in India time, not UTC", () => {
  // The default zone is the zone for everybody unless the backend sends one per
  // user. Influen inherited UTC and every time on screen read 5.5 hours behind.
  // 15:04 UTC is 20:34 in Kolkata.
  expect(formatDateTime("2026-07-14T15:04:00Z")).toBe("14 Jul 2026, 8:34 PM");
  // 21:00 UTC is already the next day in India.
  expect(formatDate("2026-07-14T21:00:00Z")).toBe("15 Jul 2026");
});

test("toDateString gives the calendar day in the zone, not the UTC day", () => {
  const instant = "2026-07-14T21:00:00Z";
  expect(toDateString(instant, "UTC")).toBe("2026-07-14");
  expect(toDateString(instant, "Asia/Dubai")).toBe("2026-07-15");
});

test("empty and malformed values render as a dash, never as Invalid Date", () => {
  expect(formatBusinessDate(null)).toBe("—");
  expect(formatBusinessDate("")).toBe("—");
  expect(formatBusinessDate("not-a-date")).toBe("—");
  expect(formatDate(null)).toBe("—");
  expect(formatDate("nonsense")).toBe("—");
});

test("the short and long business-date forms keep the day as written", () => {
  // If this fails west of UTC, a heading says Wednesday on a Thursday and a
  // due date shows a day early.
  expect(formatBusinessDayMonth("2026-09-25")).toBe("25 Sep");
  expect(formatBusinessDayMonth("2026-10-07")).toBe("07 Oct");
  expect(formatBusinessDateLong("2026-09-24")).toBe("Thursday, 24 September");
  expect(formatBusinessDateLong(null)).toBe("—");
});

// ── The `datetime-local` round trip ─────────────────────────────────────────
//
// The failure these guard is silent: someone types a time, the browser reads it
// in the device's zone, and the record stores an instant hours from the truth
// on a screen that then renders it back in Asia/Kolkata. Nothing looks wrong at
// any step.

test("a typed wall time is read in the given zone, not the device's", () => {
  // 14:30 in India is 09:00 UTC. The device this runs on is irrelevant, and
  // that is the whole point.
  expect(instantFromZonedInput("2026-09-08T14:30", "Asia/Kolkata")).toBe(
    "2026-09-08T09:00:00.000Z",
  );
});

test("the same digits mean different instants in different zones", () => {
  const kolkata = instantFromZonedInput("2026-09-08T14:30", "Asia/Kolkata");
  const utc = instantFromZonedInput("2026-09-08T14:30", "Etc/UTC");
  expect(utc).toBe("2026-09-08T14:30:00.000Z");
  expect(kolkata).not.toBe(utc);
});

test("it survives a daylight-saving jump, which is why there are two passes", () => {
  // New York moves to EDT at 02:00 on 8 March 2026. 14:00 that afternoon is
  // UTC−4, not the UTC−5 a single-pass guess starting from midnight UTC lands on.
  expect(instantFromZonedInput("2026-03-08T14:00", "America/New_York")).toBe(
    "2026-03-08T18:00:00.000Z",
  );
});

test("it refuses anything that is not a datetime-local value", () => {
  expect(instantFromZonedInput("2026-09-08", DEFAULT_TIME_ZONE)).toBeNull();
  expect(instantFromZonedInput("", DEFAULT_TIME_ZONE)).toBeNull();
  expect(instantFromZonedInput("not a date", DEFAULT_TIME_ZONE)).toBeNull();
});

test("an instant round-trips back to the digits somebody typed", () => {
  const typed = "2026-09-08T14:30";
  const instant = instantFromZonedInput(typed, "Asia/Kolkata");
  expect(zonedInputValue(instant, "Asia/Kolkata")).toBe(typed);
});

test("midnight is 00:00, not 24:00", () => {
  // `hour: "2-digit"` with `hour12: false` renders midnight as "24" on some
  // engines, which would put the input a day out and read as an invalid value.
  const midnight = instantFromZonedInput("2026-09-08T00:00", "Asia/Kolkata");
  expect(midnight).toBe("2026-09-07T18:30:00.000Z");
  expect(zonedInputValue(midnight, "Asia/Kolkata")).toBe("2026-09-08T00:00");
});

test("nothing in, empty string out", () => {
  expect(zonedInputValue(null)).toBe("");
  expect(zonedInputValue(undefined)).toBe("");
});

// ── formatTimeLeft ──────────────────────────────────────────────────────────
//
// A screen decides what to colour urgent from `hoursLeft`, so the boundary
// between "hours" and "days" is not cosmetic: a deadline 25 hours away must not
// report as urgent, and one 23 hours away must.

const inFuture = (ms: number) => new Date(Date.now() + ms);
const HOUR = 3_600_000;

test("a deadline that has passed says so, rather than counting backwards", () => {
  const past = formatTimeLeft(new Date(Date.now() - HOUR));
  expect(past.text).toBe("Expired");
  expect(past.expired).toBe(true);
  expect(past.hoursLeft).toBe(0);
});

test("the unit follows the distance, and singulars are singular", () => {
  expect(formatTimeLeft(inFuture(90_000)).text).toBe("1 minute left");
  expect(formatTimeLeft(inFuture(30 * 60_000)).text).toBe("30 minutes left");
  expect(formatTimeLeft(inFuture(HOUR + 60_000)).text).toBe("1 hour left");
  expect(formatTimeLeft(inFuture(8 * HOUR)).text).toBe("8 hours left");
  expect(formatTimeLeft(inFuture(25 * HOUR)).text).toBe("1 day left");
  expect(formatTimeLeft(inFuture(10 * 24 * HOUR)).text).toBe("10 days left");
});

test("hoursLeft crosses the day boundary where the screen expects it to", () => {
  expect(formatTimeLeft(inFuture(23 * HOUR + 60_000)).hoursLeft).toBe(23);
  expect(formatTimeLeft(inFuture(25 * HOUR)).hoursLeft).toBe(25);
});

test("no deadline is not an expired one", () => {
  const none = formatTimeLeft(null);
  expect(none.expired).toBe(false);
  expect(none.text).not.toBe("Expired");
});

// ── formatCountdown ─────────────────────────────────────────────────────────
//
// A verification screen shows this ticking under the code. A seconds column
// without its leading zero reads "14:5" for five past, and a tick that lands just
// after the deadline must not print a minus sign at somebody typing a code.

test("a countdown always shows two digits of seconds", () => {
  expect(formatCountdown(900)).toBe("15:00");
  expect(formatCountdown(845)).toBe("14:05");
  expect(formatCountdown(61)).toBe("1:01");
  expect(formatCountdown(9)).toBe("0:09");
});

test("a countdown past its deadline stops at zero instead of going negative", () => {
  expect(formatCountdown(0)).toBe("0:00");
  expect(formatCountdown(-3)).toBe("0:00");
});

test("a countdown rounds a part-second down, so it never shows more time than is left", () => {
  expect(formatCountdown(59.9)).toBe("0:59");
});
