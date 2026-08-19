import { NUMBER_LOCALE, toBig, Big, type QuantityString } from "./decimal";

// Quantities use 3 dp so fractional units (kg, litre, metre) survive the round
// trip. Storage precision is fixed by the column; display rounding is separate.
const QTY_DP = 3;

/** Round a quantity to 3 dp — matches a backend `quantize_quantity`. */
export function quantizeQuantity(value: Big | string | number): QuantityString {
  return toBig(value as string)
    .round(QTY_DP, Big.roundHalfUp)
    .toFixed(QTY_DP);
}

/** True when a quantity wire string is a positive number. */
export function isPositiveQuantity(value: string): boolean {
  return toBig(value).gt(0);
}

/**
 * Format a quantity for display, trailing zeros trimmed.
 *
 * Quantities are stored at 3 dp, so the padding is storage, not information:
 * render the raw wire string and a stock level of 1990 reads as "1990.000".
 *
 * Use this for **display only**. When seeding an editable `type="number"` input,
 * use `toBig(x).toString()` instead — the locale grouping here injects commas
 * that a number input rejects.
 */
export function formatQuantity(
  value: QuantityString | number | null | undefined,
  decimalPlaces = QTY_DP,
): string {
  const num = Number(toBig(value as string).toString());
  return new Intl.NumberFormat(NUMBER_LOCALE, {
    maximumFractionDigits: decimalPlaces,
  }).format(num);
}
