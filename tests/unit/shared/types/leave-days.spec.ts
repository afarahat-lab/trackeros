import { countLeaveDays } from '../../../../src/shared/types/leave-days';

describe('countLeaveDays', () => {
  it('returns 1 for a single-day leave', () => {
    const start = new Date(2026, 0, 5);
    const end = new Date(2026, 0, 5);
    expect(countLeaveDays(start, end)).toBe(1);
  });

  it('counts whole calendar days inclusive of both ends', () => {
    const start = new Date(2026, 0, 5);
    const end = new Date(2026, 0, 9);
    expect(countLeaveDays(start, end)).toBe(5);
  });

  it('spans weeks without excluding weekends', () => {
    const start = new Date(2026, 0, 5); // Monday
    const end = new Date(2026, 0, 11); // Sunday
    expect(countLeaveDays(start, end)).toBe(7);
  });

  it('spans a month boundary', () => {
    const start = new Date(2026, 0, 30);
    const end = new Date(2026, 1, 2);
    expect(countLeaveDays(start, end)).toBe(4);
  });

  it('spans a year boundary (no split)', () => {
    const start = new Date(2025, 11, 31);
    const end = new Date(2026, 0, 1);
    expect(countLeaveDays(start, end)).toBe(2);
  });

  it('ignores the time-of-day component', () => {
    const start = new Date(2026, 0, 5, 23, 59, 59, 999);
    const end = new Date(2026, 0, 6, 0, 0, 0, 0);
    expect(countLeaveDays(start, end)).toBe(2);
  });

  it('handles daylight-saving transitions with a stable result', () => {
    const start = new Date(2026, 2, 8); // Mar 8 (daylight saving for some zones)
    const end = new Date(2026, 2, 9);
    expect(countLeaveDays(start, end)).toBe(2);
  });
});
