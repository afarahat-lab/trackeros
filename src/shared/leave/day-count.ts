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
