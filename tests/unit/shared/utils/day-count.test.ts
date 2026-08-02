import { countBusinessDays } from '../../../../src/shared/utils/day-count';

describe('countBusinessDays', () => {
  it('should count a single business day (Monday)', () => {
    const mon = new Date('2026-08-03'); // Monday
    expect(countBusinessDays(mon, mon, [])).toBe(1);
  });

  it('should return 0 for a weekend day (Saturday)', () => {
    const sat = new Date('2026-08-01'); // Saturday
    expect(countBusinessDays(sat, sat, [])).toBe(0);
  });

  it('should return 0 for a weekend day (Sunday)', () => {
    const sun = new Date('2026-08-02'); // Sunday
    expect(countBusinessDays(sun, sun, [])).toBe(0);
  });

  it('should count a full business week (Mon–Fri) as 5 days', () => {
    const mon = new Date('2026-08-03'); // Monday
    const fri = new Date('2026-08-07'); // Friday
    expect(countBusinessDays(mon, fri, [])).toBe(5);
  });

  it('should exclude weekends in a range spanning two weeks', () => {
    const mon = new Date('2026-08-03'); // Monday
    const nextFri = new Date('2026-08-14'); // Friday (12 days later)
    // Aug 3-7: 5 days, Aug 8-9: weekend, Aug 10-14: 5 days = 10 business days
    expect(countBusinessDays(mon, nextFri, [])).toBe(10);
  });

  it('should exclude a holiday that falls on a business day', () => {
    const mon = new Date('2026-08-03'); // Monday
    const fri = new Date('2026-08-07'); // Friday
    const holiday = new Date('2026-08-05'); // Wednesday
    expect(countBusinessDays(mon, fri, [holiday])).toBe(4);
  });

  it('should not double-count a holiday that falls on a weekend', () => {
    const mon = new Date('2026-08-03'); // Monday
    const fri = new Date('2026-08-07'); // Friday
    const holiday = new Date('2026-08-08'); // Saturday (already excluded)
    expect(countBusinessDays(mon, fri, [holiday])).toBe(5);
  });

  it('should handle multiple holidays', () => {
    const mon = new Date('2026-08-03'); // Monday
    const fri = new Date('2026-08-07'); // Friday
    const holidays = [
      new Date('2026-08-04'), // Tuesday
      new Date('2026-08-06'), // Thursday
    ];
    expect(countBusinessDays(mon, fri, holidays)).toBe(3);
  });

  it('should be inclusive of start and end when both are business days', () => {
    const tue = new Date('2026-08-04'); // Tuesday
    const thu = new Date('2026-08-06'); // Thursday
    expect(countBusinessDays(tue, thu, [])).toBe(3);
  });

  it('should return 0 when start is after end', () => {
    const fri = new Date('2026-08-07');
    const mon = new Date('2026-08-03');
    expect(countBusinessDays(fri, mon, [])).toBe(0);
  });

  it('should handle a range with only weekends', () => {
    const sat = new Date('2026-08-01'); // Saturday
    const sun = new Date('2026-08-02'); // Sunday
    expect(countBusinessDays(sat, sun, [])).toBe(0);
  });

  it('should handle a range where all business days are holidays', () => {
    const mon = new Date('2026-08-03'); // Monday
    const wed = new Date('2026-08-05'); // Wednesday
    const holidays = [
      new Date('2026-08-03'), // Monday
      new Date('2026-08-04'), // Tuesday
      new Date('2026-08-05'), // Wednesday
    ];
    expect(countBusinessDays(mon, wed, holidays)).toBe(0);
  });
});
