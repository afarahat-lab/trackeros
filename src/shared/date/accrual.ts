import { ConflictError } from '../errors';

/**
 * The canonical UTC day boundary for accrual arithmetic. node-pg parses `date`
 * columns to LOCAL midnight by default, which silently shifted every accrual
 * period by a day on non-UTC servers; `src/shared/db/connection.ts` pins DATE
 * parsing to UTC, and every day boundary in this domain is therefore derived
 * with getUTC* rather than the process-local timezone.
 */
export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

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
