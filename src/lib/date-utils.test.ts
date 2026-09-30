import { test, expect } from "vitest";
import {
  formatBusinessDate,
  formatDate,
  formatDateTime,
  formatTime,
  toDateString,
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
