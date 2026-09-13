import { ConflictError } from '../errors';

/**
 * Accrual-period derivation helpers. An accrual period is anchored on an
 * employee's hire date and steps forward by `accrualMonths`. The returned
 * period is half-open [start, end): `start` is UTC midnight of the anchor and
 * advances by whole months, while `end` is exclusive.
 *
 * These are pure UTC date arithmetic with no balance-domain knowledge, so they
 * live in `shared` and are unit-testable without either consumer module. The
 * UTC pinning is load-bearing: node-pg would otherwise parse `date` columns to
 * LOCAL midnight while `getUTC*` reads UTC fields, silently shifting every
 * period by a day on a non-UTC server.
 */

/** Returns a Date at UTC midnight of the input's UTC year/month/day. */
export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Returns a new Date shifted by `months`, clamping the day to the last day of the target month. */
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
 * Returns the half-open accrual period [start, end) containing `date`, anchored
 * on `anchor` and stepping by `accrualMonths`.
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
