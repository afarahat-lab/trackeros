function toUtcMidnight(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function toDateKey(date: Date): string {
  const d = toUtcMidnight(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function countBusinessDays(
  start: Date,
  end: Date,
  holidays: Date[],
): number {
  const startDate = toUtcMidnight(start);
  const endDate = toUtcMidnight(end);

  if (startDate > endDate) {
    return 0;
  }

  const holidaySet = new Set(holidays.map(toDateKey));

  let count = 0;
  const current = new Date(startDate);

  while (current <= endDate) {
    const dayOfWeek = current.getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = holidaySet.has(toDateKey(current));

    if (!isWeekend && !isHoliday) {
      count++;
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return count;
}
