/**
 * New York State combined sales tax rate (state + NYC local), expressed as a
 * decimal. Adjust this constant if a different locality applies.
 */
export const NY_SALES_TAX_RATE = 0.08875;

/** Rounds a currency value to cents. */
export function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Adds NY sales tax to a pre-tax amount. */
export function applyNySalesTax(amount: number): number {
  return roundToCents(amount * (1 + NY_SALES_TAX_RATE));
}
