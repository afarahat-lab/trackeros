import { pool } from '../db/connection';

function toDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function isWeekend(d: Date): boolean {
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

function isSameDate(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

export function calculateBusinessDays(
  startDate: Date,
  endDate: Date,
  holidays: Date[],
): number {
  const start = toDateOnly(startDate);
  const end = toDateOnly(endDate);

  if (start > end) {
    return 0;
  }

  const normalizedHolidays = holidays.map((h) => toDateOnly(h));

  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    if (
      !isWeekend(current) &&
      !normalizedHolidays.some((h) => isSameDate(h, current))
    ) {
      count++;
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return count;
}

export async function getHolidaysForYear(year: number): Promise<Date[]> {
  const result = await pool.query(
    `SELECT date, name, country
     FROM holidays
     WHERE EXTRACT(YEAR FROM date) = $1
       AND country = $2
     ORDER BY date`,
    [year, 'US'],
  );

  return result.rows.map((row: Record<string, unknown>) => new Date(row.date as string));
}
