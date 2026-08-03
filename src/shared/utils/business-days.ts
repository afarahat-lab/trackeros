function normalizeToUTCMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function toDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

export function countBusinessDays(startDate: Date, endDate: Date, holidays: Date[]): number {
  const start = normalizeToUTCMidnight(startDate);
  const end = normalizeToUTCMidnight(endDate);

  if (end.getTime() < start.getTime()) {
    throw new Error('endDate must not be before startDate');
  }

  const holidayKeys = new Set(holidays.map((h) => toDateKey(normalizeToUTCMidnight(h))));

  let count = 0;
  const current = new Date(start);

  while (current.getTime() < end.getTime()) {
    if (!isWeekend(current) && !holidayKeys.has(toDateKey(current))) {
      count++;
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return count;
}
