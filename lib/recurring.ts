/** A point-in-time amount for a recurring expense. */
export interface AmountEntry {
  amount: number;
  effectiveFrom: Date;
}

/**
 * Returns the amount in effect on `date` for a recurring expense, choosing the
 * latest entry whose `effectiveFrom` is on or before `date`. Falls back to the
 * earliest entry so dates before the first recorded amount still resolve to the
 * initial amount.
 */
export function resolveAmount(entries: AmountEntry[], date: Date): number {
  let latest: AmountEntry | null = null;
  let earliest: AmountEntry | null = null;

  for (const entry of entries) {
    if (!earliest || entry.effectiveFrom.getTime() < earliest.effectiveFrom.getTime()) {
      earliest = entry;
    }
    if (entry.effectiveFrom.getTime() <= date.getTime()) {
      if (!latest || entry.effectiveFrom.getTime() > latest.effectiveFrom.getTime()) {
        latest = entry;
      }
    }
  }

  if (latest) return latest.amount;
  return earliest?.amount ?? 0;
}

/** Returns the amount currently in effect for a recurring expense. */
export function currentAmount(entries: AmountEntry[]): number {
  return resolveAmount(entries, new Date());
}
