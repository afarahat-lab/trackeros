import {
  startOfUtcDay,
  addMonths,
  periodContaining,
} from '../../../src/shared/date';
import { ConflictError } from '../../../src/shared/errors';

describe('startOfUtcDay', () => {
  it('returns a new Date at UTC midnight of the input UTC day', () => {
    const input = new Date(Date.UTC(2023, 5, 15, 14, 30, 45, 123));
    const result = startOfUtcDay(input);

    expect(result.getTime()).toBe(Date.UTC(2023, 5, 15));
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCSeconds()).toBe(0);
    expect(result.getUTCMilliseconds()).toBe(0);
  });

  it('does not mutate the input', () => {
    const input = new Date(Date.UTC(2023, 5, 15, 14, 30, 45, 123));
    const before = input.getTime();
    startOfUtcDay(input);
    expect(input.getTime()).toBe(before);
  });
});

describe('addMonths', () => {
  it('advances the month without mutating the input', () => {
    const input = new Date(Date.UTC(2023, 0, 15));
    const before = input.getTime();
    const result = addMonths(input, 3);

    expect(result.getTime()).toBe(Date.UTC(2023, 3, 15));
    expect(input.getTime()).toBe(before);
  });

  it('clamps the day to the last day of the target month', () => {
    expect(addMonths(new Date(Date.UTC(2023, 0, 31)), 1).getTime()).toBe(
      Date.UTC(2023, 1, 28),
    );
    expect(addMonths(new Date(Date.UTC(2023, 0, 31)), 2).getTime()).toBe(
      Date.UTC(2023, 2, 31),
    );
  });

  it('clamps correctly across a leap-year February', () => {
    expect(addMonths(new Date(Date.UTC(2024, 0, 31)), 1).getTime()).toBe(
      Date.UTC(2024, 1, 29),
    );
  });

  it('supports negative month offsets', () => {
    expect(addMonths(new Date(Date.UTC(2023, 2, 15)), -1).getTime()).toBe(
      Date.UTC(2023, 1, 15),
    );
    expect(addMonths(new Date(Date.UTC(2023, 2, 31)), -1).getTime()).toBe(
      Date.UTC(2023, 1, 28),
    );
  });
});

describe('periodContaining', () => {
  const anchor = new Date(Date.UTC(2023, 0, 10));

  it('returns the period containing the date', () => {
    const result = periodContaining(anchor, 1, new Date(Date.UTC(2023, 1, 5)));
    expect(result.start.getTime()).toBe(Date.UTC(2023, 0, 10));
    expect(result.end.getTime()).toBe(Date.UTC(2023, 1, 10));
  });

  it('includes a date equal to the anchor start', () => {
    const result = periodContaining(anchor, 1, new Date(Date.UTC(2023, 0, 10)));
    expect(result.start.getTime()).toBe(Date.UTC(2023, 0, 10));
    expect(result.end.getTime()).toBe(Date.UTC(2023, 1, 10));
  });

  it('uses the UTC day start of the anchor, not the anchor time', () => {
    const timedAnchor = new Date(Date.UTC(2023, 0, 10, 6, 0, 0));
    const result = periodContaining(timedAnchor, 1, new Date(Date.UTC(2023, 0, 10, 12, 0)));
    expect(result.start.getTime()).toBe(Date.UTC(2023, 0, 10));
    expect(result.end.getTime()).toBe(Date.UTC(2023, 1, 10));
  });

  it('throws ConflictError when date precedes anchor', () => {
    expect(() => periodContaining(anchor, 1, new Date(Date.UTC(2023, 0, 9)))).toThrow(
      ConflictError,
    );
  });

  it('supports multi-month accrual periods', () => {
    const result = periodContaining(anchor, 2, new Date(Date.UTC(2023, 1, 15)));
    expect(result.start.getTime()).toBe(Date.UTC(2023, 0, 10));
    expect(result.end.getTime()).toBe(Date.UTC(2023, 2, 10));
  });

  it('clamps the period end when the anchor day exceeds the target month', () => {
    const anchor31 = new Date(Date.UTC(2023, 0, 31));
    const result = periodContaining(anchor31, 1, new Date(Date.UTC(2023, 1, 1)));
    expect(result.start.getTime()).toBe(Date.UTC(2023, 0, 31));
    expect(result.end.getTime()).toBe(Date.UTC(2023, 1, 28));
  });
});

describe('date helpers under a non-UTC timezone', () => {
  const originalTZ = process.env.TZ;

  beforeAll(() => {
    process.env.TZ = 'Asia/Riyadh';
  });

  afterAll(() => {
    process.env.TZ = originalTZ;
  });

  it('startOfUtcDay is unaffected by the process timezone', () => {
    const input = new Date(Date.UTC(2023, 5, 15, 14, 30, 45, 123));
    expect(startOfUtcDay(input).getTime()).toBe(Date.UTC(2023, 5, 15));
  });

  it('addMonths is unaffected by the process timezone', () => {
    const input = new Date(Date.UTC(2023, 0, 31));
    expect(addMonths(input, 1).getTime()).toBe(Date.UTC(2023, 1, 28));
  });

  it('periodContaining is unaffected by the process timezone', () => {
    const anchor = new Date(Date.UTC(2023, 0, 10));
    const result = periodContaining(anchor, 1, new Date(Date.UTC(2023, 1, 5)));
    expect(result.start.getTime()).toBe(Date.UTC(2023, 0, 10));
    expect(result.end.getTime()).toBe(Date.UTC(2023, 1, 10));
  });
});
