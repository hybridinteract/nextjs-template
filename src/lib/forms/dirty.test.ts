import { test } from "node:test";
import assert from "node:assert/strict";
import { isFormDirty, isEqual, anyFilled } from "./dirty.ts";

// If this is wrong the discard prompt either never fires (work is lost) or fires
// on every close (people learn to click through it, and then work is lost).

test("an untouched edit form is not dirty", () => {
  const saved = { name: "Acme", city: "Dubai" };
  assert.equal(isFormDirty({ ...saved }, saved), false);
});

test("one changed field makes it dirty", () => {
  const saved = { name: "Acme", city: "Dubai" };
  assert.equal(isFormDirty({ ...saved, city: "Doha" }, saved), true);
});

test("null and undefined compare equal", () => {
  // formToPayload maps "" to undefined, so a field can read back as either
  // without the user having touched it.
  assert.equal(isEqual(null, undefined), true);
  assert.equal(isFormDirty({ note: undefined }, { note: null }), false);
});

test("line items are compared by value, not identity", () => {
  const saved = { lines: [{ id: "1", qty: "2" }] };
  assert.equal(isFormDirty({ lines: [{ id: "1", qty: "2" }] }, saved), false);
  assert.equal(isFormDirty({ lines: [{ id: "1", qty: "3" }] }, saved), true);
  assert.equal(isFormDirty({ lines: [] }, saved), true);
});

test("a form that has not loaded yet is not dirty", () => {
  // Nothing has been typed into a form that is not on screen.
  assert.equal(isFormDirty({ name: "x" }, null), false);
  assert.equal(isFormDirty({ name: "x" }, undefined), false);
});

test("anyFilled ignores blanks and whitespace", () => {
  assert.equal(anyFilled("", null, undefined, false, []), false);
  assert.equal(anyFilled("   "), false);
  assert.equal(anyFilled("", "typed"), true);
  assert.equal(anyFilled([], ["one"]), true);
});
