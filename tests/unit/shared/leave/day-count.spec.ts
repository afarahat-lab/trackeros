import { countLeaveDays } from '../../../../src/shared/leave/day-count';

describe('countLeaveDays', () => {
  it('returns 1 for a single-day request', () => {
    const day = new Date('2026-01-01T00:00:00.000Z');
    expect(countLeaveDays(day, day)).toBe(1);
  });

  it('counts inclusive calendar days across a multi-day span', () => {
    expect(
      countLeaveDays(
        new Date('2026-01-01T00:00:00.000Z'),
        new Date('2026-01-05T00:00:00.000Z')
      )
    ).toBe(5);
  });

  it('applies no weekend exclusion', () => {
    // Friday 2026-01-02 through Monday 2026-01-05 spans 4 days including the weekend.
    expect(
      countLeaveDays(
        new Date('2026-01-02T00:00:00.000Z'),
        new Date('2026-01-05T00:00:00.000Z')
      )
    ).toBe(4);
  });

  it('applies no holiday exclusion', () => {
    // A span containing a public holiday is still counted in full.
    expect(
      countLeaveDays(
        new Date('2025-12-24T00:00:00.000Z'),
        new Date('2025-12-26T00:00:00.000Z')
      )
    ).toBe(3);
  });

  it('is independent of time-of-day', () => {
    expect(
      countLeaveDays(
        new Date('2026-01-01T23:59:00.000Z'),
        new Date('2026-01-02T00:01:00.000Z')
      )
    ).toBe(2);
  });

  it('is deterministic and pure', () => {
    const start = new Date('2026-03-10T00:00:00.000Z');
    const end = new Date('2026-03-14T00:00:00.000Z');
    expect(countLeaveDays(start, end)).toBe(countLeaveDays(start, end));
  });
});
