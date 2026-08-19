// Decimal-safe numeric helpers. Money and quantity wire values are strings and
// all math goes through big.js — never JS float math.
//
// 0.1 + 0.2 === 0.30000000000000004. On an invoice line that is a penny that
// nobody can account for, and it compounds across a total.
export { Big, NUMBER_LOCALE, toBig, type MoneyString, type QuantityString } from "./decimal";
export { quantizeMoney, lineTotal, taxAmount, sumMoney, formatMoney } from "./money";
export { quantizeQuantity, isPositiveQuantity, formatQuantity } from "./quantity";
