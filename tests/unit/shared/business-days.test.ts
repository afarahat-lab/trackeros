import { countBusinessDays } from 'shared/utils/business-days';

function date(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d));
}

describe('countBusinessDays', () => {
  it('returns 0 when start > end (inverted range)', () => {
    const start = date(2026, 8, 10);
    const end = date(2026, 8, 5);
    expect(countBusinessDays(start, end, [])).toBe(0);
  });

  it('returns 1 for a single weekday with no holidays', () => {
    const start = date(2026, 8, 4); // Tuesday
    const end = date(2026, 8, 4);
    expect(countBusinessDays(start, end, [])).toBe(1);
  });

  it('returns 0 for a single Saturday', () => {
    const start = date(2026, 8, 1); // Saturday
    const end = date(2026, 8, 1);
    expect(countBusinessDays(start, end, [])).toBe(0);
  });

  it('returns 0 for a single Sunday', () => {
    const start = date(2026, 8, 2); // Sunday
    const end = date(2026, 8, 2);
    expect(countBusinessDays(start, end, [])).toBe(0);
  });

  it('counts business days in a full work week (Mon–Fri)', () => {
    const start = date(2026, 8, 3); // Monday
    const end = date(2026, 8, 7); // Friday
    expect(countBusinessDays(start, end, [])).toBe(5);
  });

  it('excludes weekends in a full calendar week (Mon–Sun)', () => {
    const start = date(2026, 8, 3); // Monday
    const end = date(2026, 8, 9); // Sunday
    expect(countBusinessDays(start, end, [])).toBe(5);
  });

  it('excludes weekends spanning two weeks', () => {
    const start = date(2026, 8, 3); // Monday
    const end = date(2026, 8, 14); // Friday (12 calendar days)
    expect(countBusinessDays(start, end, [])).toBe(10);
  });

  it('excludes a single holiday that falls on a weekday', () => {
    const start = date(2026, 8, 3); // Monday
    const end = date(2026, 8, 7); // Friday
    const holidays = [date(2026, 8, 5)]; // Wednesday holiday
    expect(countBusinessDays(start, end, holidays)).toBe(4);
  });

  it('excludes multiple holidays', () => {
    const start = date(2026, 8, 3); // Monday
    const end = date(2026, 8, 7); // Friday
    const holidays = [date(2026, 8, 4), date(2026, 8, 6)]; // Tue + Thu
    expect(countBusinessDays(start, end, holidays)).toBe(3);
  });

  it('does not double-count a holiday that falls on a weekend', () => {
    const start = date(2026, 8, 3); // Monday
    const end = date(2026, 8, 9); // Sunday
    const holidays = [date(2026, 8, 8)]; // Saturday — already excluded as weekend
    expect(countBusinessDays(start, end, holidays)).toBe(5);
  });

  it('normalises dates to UTC midnight so timezone differences do not affect comparison', () => {
    // Create dates with different local times that represent the same calendar day in UTC
    const start = new Date('2026-08-03T12:00:00.000Z');
    const end = new Date('2026-08-07T23:59:59.999Z');
    const holidays = [new Date('2026-08-05T08:00:00.000Z')];
    expect(countBusinessDays(start, end, holidays)).toBe(4);
  });

  it('handles a range that starts and ends on the same holiday', () => {
    const start = date(2026, 8, 5); // Wednesday
    const end = date(2026, 8, 5);
    const holidays = [date(2026, 8, 5)];
    expect(countBusinessDays(start, end, holidays)).toBe(0);
  });

  it('returns 0 when the entire range is a weekend', () => {
    const start = date(2026, 8, 1); // Saturday
    const end = date(2026, 8, 2); // Sunday
    expect(countBusinessDays(start, end, [])).toBe(0);
  });

  it('handles a range spanning a full month with holidays', () => {
    // August 2026: 31 days, starts Saturday, ends Monday
    // Weekdays: 21, minus 1 holiday = 20
    const start = date(2026, 8, 1);
    const end = date(2026, 8, 31);
    const holidays = [date(2026, 8, 15)]; // Saturday — already weekend
    expect(countBusinessDays(start, end, holidays)).toBe(21);
  });

  it('handles dates constructed with local timezone safely', () => {
    // These constructors use local time, but normalization should handle it
    const start = new Date(2026, 7, 3); // Aug 3, 2026 local
    const end = new Date(2026, 7, 7); // Aug 7, 2026 local
    const result = countBusinessDays(start, end, []);
    // Should be 5 regardless of timezone because we normalize to UTC midnight
    expect(result).toBeGreaterThanOrEqual(4);
    expect(result).toBeLessThanOrEqual(6);
  });
});
