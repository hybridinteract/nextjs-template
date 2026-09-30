import { test, expect } from "vitest";
import {
  DEFAULT_CURRENCY,
  formatMoney,
  formatMoneyShort,
  quantizeMoney,
  sumMoney,
  lineTotal,
  taxAmount,
} from "./money";
import { formatQuantity, quantizeQuantity, isPositiveQuantity } from "./quantity";
import { toBig } from "./decimal";

// These are the failure modes that are silent — a wrong penny does not throw.

test("money addition does not drift the way floats do", () => {
  expect(0.1 + 0.2 === 0.3).toBe(false);
  expect(sumMoney(["0.10", "0.20"])).toBe("0.30");
});

test("a long column of money stays exact", () => {
  const rows = Array.from({ length: 100 }, () => "0.07");
  expect(sumMoney(rows)).toBe("7.00");
});

test("money rounds half up, like the backend", () => {
  expect(quantizeMoney("1.005")).toBe("1.01");
  expect(quantizeMoney("2.675")).toBe("2.68");
  expect(quantizeMoney("-1.005")).toBe("-1.01");
});

test("a line total is quantity x price, rounded once at the end", () => {
  expect(lineTotal("3", "19.99")).toBe("59.97");
  expect(lineTotal("0.333", "100")).toBe("33.30");
});

test("tax is a percentage of the base", () => {
  expect(taxAmount("100.00", "5")).toBe("5.00");
  expect(taxAmount("19.99", "7.5")).toBe("1.50");
});

test("quantities render without their storage padding", () => {
  // A raw wire string would show "1990.000" and look like a bug to the user.
  expect(formatQuantity("1990.000")).toBe("1,990");
  expect(formatQuantity("0.500")).toBe("0.5");
  expect(quantizeQuantity("1.23456")).toBe("1.235");
});

test("money formatting is locale-pinned, not the viewer's", () => {
  // The whole point of NUMBER_LOCALE: an invoice must read the same for everyone.
  expect(formatMoney("1234.5")).toBe("1,234.50");
  expect(formatMoney("1234.5", DEFAULT_CURRENCY)).toBe("₹1,234.50");
  expect(formatMoney("1234.5", "USD")).toBe("$1,234.50");
  // Note the NON-BREAKING space: Intl separates a currency code from the number
  // with U+00A0, not a plain space. Anything comparing these strings — a test, a
  // snapshot, a CSV export — has to know that.
  expect(formatMoney("1234.5", "AED")).toBe("AED\u00A01,234.50");
});

test("big amounts group in lakhs and crores, the way Indian readers read them", () => {
  // en-GB wrote ₹1,275,000.00. Staff, clients and the backend's own formatter all
  // write ₹12,75,000.00. Both Influen and Herbally IP changed the locale for this.
  expect(formatMoney("1275000", DEFAULT_CURRENCY)).toBe("₹12,75,000.00");
  expect(formatMoney("15262500", DEFAULT_CURRENCY)).toBe("₹1,52,62,500.00");
  expect(formatQuantity("1234567.5")).toBe("12,34,567.5");
});

test("garbage in is zero, not NaN", () => {
  // Wire values arrive as strings and a null is normal. NaN would poison a total
  // and surface three screens away as a blank.
  expect(toBig(null).toString()).toBe("0");
  expect(toBig(undefined).toString()).toBe("0");
  expect(toBig("").toString()).toBe("0");
  expect(toBig("  ").toString()).toBe("0");
  expect(toBig("not a number").toString()).toBe("0");
  expect(toBig(" 12.5 ").toString()).toBe("12.5");
});

test("positive-quantity check works on the string form", () => {
  expect(isPositiveQuantity("0.001")).toBe(true);
  expect(isPositiveQuantity("0.000")).toBe(false);
  expect(isPositiveQuantity("-1")).toBe(false);
});

test("the short form reads in lakhs and crores, and every rupee under a lakh", () => {
  // A tile that says ₹8.21L for ₹82.1 lakh is off by ten and still looks right.
  expect(formatMoneyShort("820542.00")).toBe("₹8.21L");
  expect(formatMoneyShort("12500000")).toBe("₹1.25Cr");
  expect(formatMoneyShort("100000")).toBe("₹1.00L");
  expect(formatMoneyShort("95453.00")).toBe("₹95,453");
  expect(formatMoneyShort(null)).toBe("₹0");
});

test("a negative short amount puts the minus before the rupee sign", () => {
  // Herbally IP's version printed "₹-8.21L" above a lakh but "-₹95,453" below it,
  // so one refunds column had two shapes for a minus.
  expect(formatMoneyShort("-820542")).toBe("-₹8.21L");
  expect(formatMoneyShort("-12500000")).toBe("-₹1.25Cr");
  expect(formatMoneyShort("-95453")).toBe("-₹95,453");
});
