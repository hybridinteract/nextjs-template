import { test, expect } from "vitest";
import { isFormDirty, isEqual, anyFilled } from "./dirty";

// If this is wrong the discard prompt either never fires (work is lost) or fires
// on every close (people learn to click through it, and then work is lost).

test("an untouched edit form is not dirty", () => {
  const saved = { name: "Acme", city: "Dubai" };
  expect(isFormDirty({ ...saved }, saved)).toBe(false);
});

test("one changed field makes it dirty", () => {
  const saved = { name: "Acme", city: "Dubai" };
  expect(isFormDirty({ ...saved, city: "Doha" }, saved)).toBe(true);
});

test("null and undefined compare equal", () => {
  // formToPayload maps "" to undefined, so a field can read back as either
  // without the user having touched it.
  expect(isEqual(null, undefined)).toBe(true);
  expect(isFormDirty({ note: undefined }, { note: null })).toBe(false);
});

test("line items are compared by value, not identity", () => {
  const saved = { lines: [{ id: "1", qty: "2" }] };
  expect(isFormDirty({ lines: [{ id: "1", qty: "2" }] }, saved)).toBe(false);
  expect(isFormDirty({ lines: [{ id: "1", qty: "3" }] }, saved)).toBe(true);
  expect(isFormDirty({ lines: [] }, saved)).toBe(true);
});

test("a form that has not loaded yet is not dirty", () => {
  // Nothing has been typed into a form that is not on screen.
  expect(isFormDirty({ name: "x" }, null)).toBe(false);
  expect(isFormDirty({ name: "x" }, undefined)).toBe(false);
});

test("anyFilled ignores blanks and whitespace", () => {
  expect(anyFilled("", null, undefined, false, [])).toBe(false);
  expect(anyFilled("   ")).toBe(false);
  expect(anyFilled("", "typed")).toBe(true);
  expect(anyFilled([], ["one"])).toBe(true);
});
