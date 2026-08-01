import { calculateBusinessDays, getHolidaysForYear } from 'shared/utils';
import { pool } from 'shared/db/connection';

jest.mock('shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mockQuery = pool.query as jest.Mock;

describe('calculateBusinessDays', () => {
  it('should return 1 for same-day (Monday)', () => {
    const mon = new Date('2026-08-03'); // Monday
    expect(calculateBusinessDays(mon, mon, [])).toBe(1);
  });

  it('should return 0 for same-day Saturday', () => {
    const sat = new Date('2026-08-01'); // Saturday
    expect(calculateBusinessDays(sat, sat, [])).toBe(0);
  });

  it('should return 0 for same-day Sunday', () => {
    const sun = new Date('2026-08-02'); // Sunday
    expect(calculateBusinessDays(sun, sun, [])).toBe(0);
  });

  it('should exclude weekends in a full week span', () => {
    const mon = new Date('2026-08-03'); // Monday
    const fri = new Date('2026-08-07'); // Friday
    // Mon-Fri = 5 business days
    expect(calculateBusinessDays(mon, fri, [])).toBe(5);
  });

  it('should exclude weekends in a span that includes weekends', () => {
    const mon = new Date('2026-08-03'); // Monday
    const sun = new Date('2026-08-09'); // Sunday
    // Mon-Fri = 5 business days, Sat-Sun excluded
    expect(calculateBusinessDays(mon, sun, [])).toBe(5);
  });

  it('should exclude holidays', () => {
    const mon = new Date('2026-08-03'); // Monday
    const fri = new Date('2026-08-07'); // Friday
    const holidays = [new Date('2026-08-05')]; // Wednesday holiday
    // Mon, Tue, Thu, Fri = 4 business days
    expect(calculateBusinessDays(mon, fri, holidays)).toBe(4);
  });

  it('should exclude holidays that fall on weekends without double-counting', () => {
    const mon = new Date('2026-08-03'); // Monday
    const fri = new Date('2026-08-07'); // Friday
    const holidays = [new Date('2026-08-01')]; // Saturday holiday — already excluded
    // Mon-Fri = 5 business days (holiday on Saturday doesn't reduce further)
    expect(calculateBusinessDays(mon, fri, holidays)).toBe(5);
  });

  it('should handle multi-day spans across weeks', () => {
    const start = new Date('2026-08-03'); // Monday
    const end = new Date('2026-08-14'); // Friday (2 weeks later)
    // 10 business days (Mon-Fri x2)
    expect(calculateBusinessDays(start, end, [])).toBe(10);
  });

  it('should handle multi-day spans with holidays', () => {
    const start = new Date('2026-08-03'); // Monday
    const end = new Date('2026-08-14'); // Friday
    const holidays = [
      new Date('2026-08-05'), // Wednesday week 1
      new Date('2026-08-12'), // Wednesday week 2
    ];
    // 10 business days - 2 holidays = 8
    expect(calculateBusinessDays(start, end, holidays)).toBe(8);
  });

  it('should return 0 for inverted range (startDate > endDate)', () => {
    const start = new Date('2026-08-10');
    const end = new Date('2026-08-01');
    expect(calculateBusinessDays(start, end, [])).toBe(0);
  });

  it('should handle dates with arbitrary time components', () => {
    const start = new Date('2026-08-03T23:59:59');
    const end = new Date('2026-08-04T00:00:01');
    // Both normalize to Aug 3 and Aug 4 (Mon-Tue) = 2 business days
    expect(calculateBusinessDays(start, end, [])).toBe(2);
  });

  it('should return 0 when all days are weekends', () => {
    const sat = new Date('2026-08-01'); // Saturday
    const sun = new Date('2026-08-02'); // Sunday
    expect(calculateBusinessDays(sat, sun, [])).toBe(0);
  });

  it('should return 0 when all days are holidays', () => {
    const mon = new Date('2026-08-03'); // Monday
    const tue = new Date('2026-08-04'); // Tuesday
    const holidays = [
      new Date('2026-08-03'),
      new Date('2026-08-04'),
    ];
    expect(calculateBusinessDays(mon, tue, holidays)).toBe(0);
  });

  it('should handle empty holidays array', () => {
    const mon = new Date('2026-08-03');
    const fri = new Date('2026-08-07');
    expect(calculateBusinessDays(mon, fri, [])).toBe(5);
  });

  it('should never throw for any Date inputs', () => {
    expect(() => calculateBusinessDays(new Date('invalid'), new Date(), [])).not.toThrow();
    expect(() => calculateBusinessDays(new Date(), new Date('invalid'), [])).not.toThrow();
  });

  it('should be idempotent', () => {
    const start = new Date('2026-08-03');
    const end = new Date('2026-08-07');
    const holidays = [new Date('2026-08-05')];
    const result1 = calculateBusinessDays(start, end, holidays);
    const result2 = calculateBusinessDays(start, end, holidays);
    expect(result1).toBe(result2);
  });
});

describe('getHolidaysForYear', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('should query the holidays table for the given year and country US', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await getHolidaysForYear(2026);

    expect(mockQuery).toHaveBeenCalledWith(
      `SELECT date, name, country
     FROM holidays
     WHERE EXTRACT(YEAR FROM date) = $1
       AND country = $2
     ORDER BY date`,
      [2026, 'US'],
    );
  });

  it('should return an array of Dates when rows exist', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { date: '2026-01-01', name: "New Year's Day", country: 'US' },
        { date: '2026-07-04', name: 'Independence Day', country: 'US' },
      ],
    });

    const result = await getHolidaysForYear(2026);

    expect(result).toHaveLength(2);
    expect(result[0]).toBeInstanceOf(Date);
    expect(result[0].toISOString()).toBe(new Date('2026-01-01').toISOString());
    expect(result[1]).toBeInstanceOf(Date);
    expect(result[1].toISOString()).toBe(new Date('2026-07-04').toISOString());
  });

  it('should return an empty array when no rows exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await getHolidaysForYear(2026);

    expect(result).toEqual([]);
  });

  it('should propagate rejection when pool.query rejects', async () => {
    const error = new Error('Connection refused');
    mockQuery.mockRejectedValueOnce(error);

    await expect(getHolidaysForYear(2026)).rejects.toThrow('Connection refused');
  });

  it('should never return undefined', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await getHolidaysForYear(2026);

    expect(result).not.toBeUndefined();
    expect(result).not.toBeNull();
  });
});
