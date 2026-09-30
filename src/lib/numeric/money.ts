import { Big, NUMBER_LOCALE, toBig, type MoneyString } from "./decimal";

// Storage precision is fixed at 2 dp, mirroring a backend money column. This is
// not configurable — a per-call decimal count is a display concern, not storage.
const MONEY_DP = 2;

/**
 * The currency to pass when the record does not carry its own.
 *
 * `formatMoney` still takes the currency as an argument, and leaving it out still
 * gives a plain grouped number. That is on purpose: when the backend sends a
 * currency with each row, pass that instead. This is for the app that only ever
 * deals in one, so the code says `DEFAULT_CURRENCY` rather than "INR" in forty
 * places. Change it once, here, for a project outside India.
 */
export const DEFAULT_CURRENCY = "INR";

/** Round to 2 dp, ROUND_HALF_UP — matches a backend `quantize_money`. */
export function quantizeMoney(value: Big | string | number): MoneyString {
  return toBig(value as string)
    .round(MONEY_DP, Big.roundHalfUp)
    .toFixed(MONEY_DP);
}

/** Line total = quantity × unit price, rounded to the cent. */
export function lineTotal(quantity: string, unitPrice: string): MoneyString {
  return quantizeMoney(toBig(quantity).times(toBig(unitPrice)));
}

/** Tax = base × rate%, rounded to the cent (per line, matching the backend). */
export function taxAmount(base: string, ratePercent: string): MoneyString {
  return quantizeMoney(toBig(base).times(toBig(ratePercent)).div(100));
}

/** Sum a list of money strings, rounded to the cent. */
export function sumMoney(values: string[]): MoneyString {
  return quantizeMoney(values.reduce((acc, v) => acc.plus(toBig(v)), new Big(0)));
}

/**
 * Format a wire money string for display. `currency` (an ISO code) renders the
 * locale currency style; omit it for a plain grouped number. `decimalPlaces` is
 * display-only and defaults to 2.
 */
export function formatMoney(
  value: MoneyString | number | null | undefined,
  currency?: string,
  decimalPlaces = MONEY_DP,
): string {
  const num = Number(toBig(value as string).toString());
  return new Intl.NumberFormat(NUMBER_LOCALE, {
    ...(currency ? { style: "currency", currency } : {}),
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(num);
}

const LAKH = 100000;
const CRORE = 10000000;

/**
 * Money in the short Indian form, for a tile or a count with no room:
 * "₹8.21L", "₹1.25Cr". Under a lakh it is the whole rupee amount, "₹95,453".
 * Never on a bill or a ledger, where every rupee has to show.
 *
 * Rupees only, on purpose. Lakh and crore mean nothing in another currency, so
 * this does not follow DEFAULT_CURRENCY. A project outside India writes its own
 * K and M version.
 */
export function formatMoneyShort(value: MoneyString | number | null | undefined): string {
  const amount = toBig(value as string);
  const size = amount.abs();
  // The sign goes before the ₹, where formatMoney puts it: "-₹8.21L", not "₹-8.21L".
  const sign = amount.lt(0) ? "-" : "";
  if (size.gte(CRORE)) return `${sign}₹${size.div(CRORE).toFixed(2)}Cr`;
  if (size.gte(LAKH)) return `${sign}₹${size.div(LAKH).toFixed(2)}L`;
  return formatMoney(value, "INR", 0);
}
