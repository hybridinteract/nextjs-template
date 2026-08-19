import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatBusinessDate,
  formatDate,
  formatDateTime,
  formatTime,
  toDateString,
} from "./date-utils.ts";

// The two bugs this module exists to prevent are both off-by-one-day, and both
// are invisible until a customer in the wrong timezone reads a date.

test("a business date never shifts, whatever the viewer's zone", () => {
  // new Date("2026-07-15") parses as UTC midnight and renders as 14 Jul west of
  // UTC. This must not.
  assert.equal(formatBusinessDate("2026-07-15"), "15 Jul 2026");
  assert.equal(formatBusinessDate("2026-01-01"), "01 Jan 2026");
  assert.equal(formatBusinessDate("2026-12-31"), "31 Dec 2026");
});

test("a business date accepts a full ISO string and ignores the time", () => {
  assert.equal(formatBusinessDate("2026-07-15T23:30:00Z"), "15 Jul 2026");
});

test("the output can never be read as US mm/dd/yyyy", () => {
  // 07/08 is 7 August to a Brit and 8 July to an American. A named month cannot
  // be misread, which is why the format is fixed.
  assert.equal(formatBusinessDate("2026-08-07"), "07 Aug 2026");
});

test("an instant renders in the zone it is given", () => {
  const instant = "2026-07-14T21:00:00Z";
  assert.equal(formatDate(instant, { timeZone: "UTC" }), "14 Jul 2026");
  // Dubai is UTC+4, so 21:00Z is already the next day there.
  assert.equal(formatDate(instant, { timeZone: "Asia/Dubai" }), "15 Jul 2026");
  // New York is behind, so it is still the 14th.
  assert.equal(formatDate(instant, { timeZone: "America/New_York" }), "14 Jul 2026");
});

test("times render 24-hour by default and 12-hour on request", () => {
  const instant = "2026-07-14T15:04:00Z";
  assert.equal(formatTime(instant, { timeZone: "UTC" }), "15:04");
  assert.equal(formatTime(instant, { timeZone: "UTC", hour12: true }), "3:04 PM");
  assert.equal(formatDateTime(instant, { timeZone: "UTC" }), "14 Jul 2026, 15:04");
});

test("toDateString gives the calendar day in the zone, not the UTC day", () => {
  const instant = "2026-07-14T21:00:00Z";
  assert.equal(toDateString(instant, "UTC"), "2026-07-14");
  assert.equal(toDateString(instant, "Asia/Dubai"), "2026-07-15");
});

test("empty and malformed values render as a dash, never as Invalid Date", () => {
  assert.equal(formatBusinessDate(null), "—");
  assert.equal(formatBusinessDate(""), "—");
  assert.equal(formatBusinessDate("not-a-date"), "—");
  assert.equal(formatDate(null), "—");
  assert.equal(formatDate("nonsense"), "—");
});
