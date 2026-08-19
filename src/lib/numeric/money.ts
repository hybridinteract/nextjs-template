import { Big, NUMBER_LOCALE, toBig, type MoneyString } from "./decimal";

// Storage precision is fixed at 2 dp, mirroring a backend money column. This is
// not configurable — a per-call decimal count is a display concern, not storage.
const MONEY_DP = 2;

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
