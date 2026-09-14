import { ConflictError } from '../errors';

/**
 * Pure UTC calendar helpers. These carry no balance-domain knowledge and
 * depend only on shared-errors; they never mutate their input arguments and
 * read only the UTC fields of a Date, so results are independent of the
 * process timezone.
 */

/** Returns a new Date at UTC midnight of the input's UTC calendar day. */
export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Returns a new Date (input not mutated) with the UTC month advanced by
 * `months`, clamping the day to the last day of the target month.
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

/**
 * Returns the half-open `{ start, end }` accrual period containing `date`,
 * stepping `accrualMonths` at a time from UTC midnight of `anchor`.
 *
 * Throws ConflictError when `date < anchor` or no period resolves within the
 * 10,000-iteration safety bound.
 */
export function periodContaining(
  anchor: Date,
  accrualMonths: number,
  date: Date,
): { start: Date; end: Date } {
  if (date.getTime() < anchor.getTime()) {
    throw new ConflictError('Requested date precedes the accrual anchor');
  }

  let start = startOfUtcDay(anchor);
  // Safety bound: a finite date always lands within a finite number of periods.
  for (let i = 0; i < 10_000; i += 1) {
    const end = addMonths(start, accrualMonths);
    if (date.getTime() >= start.getTime() && date.getTime() < end.getTime()) {
      return { start, end };
    }
    start = end;
  }
  throw new ConflictError('Unable to resolve accrual period');
}
