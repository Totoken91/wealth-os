const NBSP_NARROW = " "; // U+202F NARROW NO-BREAK SPACE (espace fine)

function frenchGroup(integerPart: string): string {
  return integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP_NARROW);
}

/**
 * Format an EUR amount with French conventions:
 * - thin no-break space as thousands separator
 * - euro symbol after the number
 * - 0 decimals if integer, otherwise up to `maxDecimals`
 */
export function formatEuro(value: number, maxDecimals = 2): string {
  if (!Number.isFinite(value)) return "—";
  const isNegative = value < 0;
  const abs = Math.abs(value);
  const isInt = Number.isInteger(abs);
  const fixed = isInt ? abs.toFixed(0) : abs.toFixed(maxDecimals);
  const [intPart, decPart] = fixed.split(".");
  const grouped = frenchGroup(intPart);
  const body = decPart ? `${grouped},${decPart}` : grouped;
  return `${isNegative ? "-" : ""}${body}${NBSP_NARROW}€`;
}

/**
 * Format a signed delta in EUR with leading sign.
 */
export function formatEuroDelta(value: number, maxDecimals = 0): string {
  if (!Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const isInt = Number.isInteger(abs);
  const fixed = isInt ? abs.toFixed(0) : abs.toFixed(maxDecimals);
  const [intPart, decPart] = fixed.split(".");
  const grouped = frenchGroup(intPart);
  const body = decPart ? `${grouped},${decPart}` : grouped;
  return `${sign}${body}${NBSP_NARROW}€`;
}

/**
 * Format a percentage with French conventions (comma decimal, signed).
 */
/**
 * Format a quantity in plain decimal, never in scientific notation.
 * Trailing zeros are trimmed. Defaults to up to 8 decimals (crypto-friendly).
 */
export function formatQuantity(value: number, maxDecimals = 8): string {
  if (!Number.isFinite(value)) return "—";
  const isNegative = value < 0;
  const abs = Math.abs(value);
  const fixed = abs.toFixed(maxDecimals);
  const trimmed = fixed.replace(/\.?0+$/, "");
  return `${isNegative ? "-" : ""}${trimmed || "0"}`;
}

export function formatPct(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  const fixed = Math.abs(value).toFixed(decimals);
  const body = fixed.replace(".", ",");
  return `${sign}${body}${NBSP_NARROW}%`;
}
