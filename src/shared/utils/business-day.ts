export const DEFAULT_HOLIDAYS: Date[] = [];

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isHoliday(date: Date, holidays: Date[]): boolean {
  const dateStr = date.toISOString().slice(0, 10);
  return holidays.some((h) => h.toISOString().slice(0, 10) === dateStr);
}

export function countBusinessDays(startDate: Date, endDate: Date, holidays: Date[]): number {
  if (startDate > endDate) {
    return 0;
  }

  let count = 0;
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    if (!isWeekend(current) && !isHoliday(current, holidays)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}
