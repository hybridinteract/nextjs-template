import Big from "big.js";

// Wire values for money and quantity arrive as strings and stay strings (see
// CLAUDE.md §2) — all arithmetic goes through big.js, never JS float math.
export type MoneyString = string;
export type QuantityString = string;

// Keep big.js out of exponential notation for the magnitudes an app deals with,
// so toString()/toFixed() always render plain decimals.
Big.NE = -9; // plain notation down to 1e-9
Big.PE = 21; // …and up to 1e21

/**
 * The one locale every number is formatted in — never the browser's.
 *
 * `Intl.NumberFormat(undefined, …)` follows the viewer's device: a German-locale
 * browser renders 1234.5 as "1.234,5", so the same invoice reads as a different
 * amount depending on who opens it. Same reasoning as `date-utils`, which pins
 * "en-GB" for exactly this. Grouping with commas, decimals with a point.
 *
 * Change this once, here, if your app's numbers should read differently. Do not
 * add a per-call-site `locale` argument — that is how the split comes back.
 */
export const NUMBER_LOCALE = "en-GB";

/** Coerce any wire value to a Big, treating null/""/whitespace/garbage as 0. */
export function toBig(value: string | number | null | undefined): Big {
  if (value === null || value === undefined) return new Big(0);
  // Big() (unlike Number()) rejects surrounding whitespace, so trim first.
  const v = typeof value === "string" ? value.trim() : value;
  if (v === "") return new Big(0);
  try {
    return new Big(v);
  } catch {
    return new Big(0);
  }
}

export { Big };
