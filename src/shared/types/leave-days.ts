const MILLISECONDS_PER_DAY = 86_400_000;

/**
 * Whole calendar days, inclusive of both ends, no weekend or holiday
 * exclusion. Returns an integer: `endDate - startDate + 1`.
 */
export function countLeaveDays(start: Date, end: Date): number {
  const startMs = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endMs = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  const diff = Math.round((endMs - startMs) / MILLISECONDS_PER_DAY);
  return diff + 1;
}
