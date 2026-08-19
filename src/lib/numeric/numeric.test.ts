import { test } from "node:test";
import assert from "node:assert/strict";
import { formatMoney, quantizeMoney, sumMoney, lineTotal, taxAmount } from "./money.ts";
import { formatQuantity, quantizeQuantity, isPositiveQuantity } from "./quantity.ts";
import { toBig } from "./decimal.ts";

// These are the failure modes that are silent — a wrong penny does not throw.

test("money addition does not drift the way floats do", () => {
  assert.equal(0.1 + 0.2 === 0.3, false, "sanity: JS floats really are broken");
  assert.equal(sumMoney(["0.10", "0.20"]), "0.30");
});

test("a long column of money stays exact", () => {
  const rows = Array.from({ length: 100 }, () => "0.07");
  assert.equal(sumMoney(rows), "7.00");
});

test("money rounds half up, like the backend", () => {
  assert.equal(quantizeMoney("1.005"), "1.01");
  assert.equal(quantizeMoney("2.675"), "2.68");
  assert.equal(quantizeMoney("-1.005"), "-1.01");
});

test("a line total is quantity x price, rounded once at the end", () => {
  assert.equal(lineTotal("3", "19.99"), "59.97");
  assert.equal(lineTotal("0.333", "100"), "33.30");
});

test("tax is a percentage of the base", () => {
  assert.equal(taxAmount("100.00", "5"), "5.00");
  assert.equal(taxAmount("19.99", "7.5"), "1.50");
});

test("quantities render without their storage padding", () => {
  // A raw wire string would show "1990.000" and look like a bug to the user.
  assert.equal(formatQuantity("1990.000"), "1,990");
  assert.equal(formatQuantity("0.500"), "0.5");
  assert.equal(quantizeQuantity("1.23456"), "1.235");
});

test("money formatting is locale-pinned, not the viewer's", () => {
  // The whole point of NUMBER_LOCALE: an invoice must read the same for everyone.
  assert.equal(formatMoney("1234.5"), "1,234.50");
  // en-GB writes USD as "US$" to disambiguate it from other dollars. That is the
  // pinned locale doing its job — the same string for every viewer.
  assert.equal(formatMoney("1234.5", "USD"), "US$1,234.50");
  // Note the NON-BREAKING space: Intl separates a currency code from the number
  // with U+00A0, not a plain space. Anything comparing these strings — a test, a
  // snapshot, a CSV export — has to know that.
  assert.equal(formatMoney("1234.5", "AED"), "AED\u00A01,234.50");
});

test("garbage in is zero, not NaN", () => {
  // Wire values arrive as strings and a null is normal. NaN would poison a total
  // and surface three screens away as a blank.
  assert.equal(toBig(null).toString(), "0");
  assert.equal(toBig(undefined).toString(), "0");
  assert.equal(toBig("").toString(), "0");
  assert.equal(toBig("  ").toString(), "0");
  assert.equal(toBig("not a number").toString(), "0");
  assert.equal(toBig(" 12.5 ").toString(), "12.5");
});

test("positive-quantity check works on the string form", () => {
  assert.equal(isPositiveQuantity("0.001"), true);
  assert.equal(isPositiveQuantity("0.000"), false);
  assert.equal(isPositiveQuantity("-1"), false);
});
