const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Shared pure helper for the inclusive calendar day count of a leave request:
 *
 *   days = (endDate - startDate) + 1
 *
 * A single-day request returns 1. No weekend or holiday exclusion is applied.
 * The same count is used for the balance-sufficiency check and the balance
 * deduction; never compute it independently elsewhere.
 *
 * Dates are normalized to UTC calendar days so the result is a whole number
 * independent of time-of-day and daylight-saving offsets.
 */
export function countLeaveDays(startDate: Date, endDate: Date): number {
  const start = Date.UTC(
    startDate.getUTCFullYear(),
    startDate.getUTCMonth(),
    startDate.getUTCDate()
  );
  const end = Date.UTC(
    endDate.getUTCFullYear(),
    endDate.getUTCMonth(),
    endDate.getUTCDate()
  );
  return Math.round((end - start) / MS_PER_DAY) + 1;
}

/**
 * The fiscal year a leave request maps to: the calendar UTC year of `startDate`.
 * A request spanning a fiscal-year boundary is attributed wholly to this year;
 * never split a request across years and never derive the year inline via
 * `date.getFullYear()` (use this helper at every site that needs a fiscal year).
 */
export function fiscalYearOf(date: Date): number {
  return date.getUTCFullYear();
}
