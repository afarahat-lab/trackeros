import { PgHolidayRepository } from '../../../../src/shared/holidays/holiday.repository';
import type { Holiday } from '../../../../src/shared/holidays/holiday.model';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

import { pool } from '../../../../src/shared/db/connection';

const mockQuery = pool.query as jest.Mock;

function makeRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: overrides.id ?? 'hol-001',
    date: overrides.date ?? new Date('2026-01-01T00:00:00Z'),
    name: overrides.name ?? "New Year's Day",
    country: overrides.country ?? 'US',
  };
}

function makeEntity(overrides: Partial<Holiday> = {}): Holiday {
  return {
    id: 'hol-001',
    date: new Date(2026, 0, 1),
    name: "New Year's Day",
    country: 'US',
    ...overrides,
  };
}

describe('PgHolidayRepository', () => {
  let repo: PgHolidayRepository;

  beforeEach(() => {
    repo = new PgHolidayRepository();
    jest.clearAllMocks();
  });

  describe('findByDateRange', () => {
    it('should return holidays within the inclusive date range', async () => {
      const row1 = makeRow({ id: 'hol-001', date: new Date('2026-01-01T00:00:00Z'), name: "New Year's Day" });
      const row2 = makeRow({ id: 'hol-002', date: new Date('2026-07-04T00:00:00Z'), name: 'Independence Day' });
      mockQuery.mockResolvedValueOnce({ rows: [row1, row2], rowCount: 2 } as never);

      const result = await repo.findByDateRange(
        new Date('2026-01-01'),
        new Date('2026-12-31'),
      );

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('hol-001');
      expect(result[0].name).toBe("New Year's Day");
      expect(result[0].country).toBe('US');
      expect(result[0].date.getFullYear()).toBe(2026);
      expect(result[0].date.getMonth()).toBe(0);
      expect(result[0].date.getDate()).toBe(1);
      expect(result[1].id).toBe('hol-002');
      expect(result[1].name).toBe('Independence Day');
      expect(result[1].date.getFullYear()).toBe(2026);
      expect(result[1].date.getMonth()).toBe(6);
      expect(result[1].date.getDate()).toBe(4);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM holidays WHERE date >= $1 AND date <= $2 ORDER BY date',
        [expect.any(Date), expect.any(Date)],
      );
    });

    it('should return an empty array when no holidays fall in the range', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const result = await repo.findByDateRange(
        new Date('2026-03-15'),
        new Date('2026-03-20'),
      );

      expect(result).toEqual([]);
    });

    it('should return Date objects with correct local date components for countBusinessDays compatibility', async () => {
      const row = makeRow({ id: 'hol-001', date: new Date('2026-12-25T00:00:00Z'), name: 'Christmas Day' });
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 } as never);

      const result = await repo.findByDateRange(
        new Date('2026-12-01'),
        new Date('2026-12-31'),
      );

      const holidayDate = result[0].date;
      expect(holidayDate.getFullYear()).toBe(2026);
      expect(holidayDate.getMonth()).toBe(11);
      expect(holidayDate.getDate()).toBe(25);
    });

    it('should reject on a pool error', async () => {
      const error = new Error('Connection refused');
      mockQuery.mockRejectedValueOnce(error);

      await expect(
        repo.findByDateRange(new Date('2026-01-01'), new Date('2026-12-31')),
      ).rejects.toThrow('Connection refused');
    });
  });

  describe('findByYear', () => {
    it('should return holidays for the given calendar year', async () => {
      const row1 = makeRow({ id: 'hol-001', date: new Date('2026-01-01T00:00:00Z'), name: "New Year's Day" });
      const row2 = makeRow({ id: 'hol-002', date: new Date('2026-12-25T00:00:00Z'), name: 'Christmas Day' });
      mockQuery.mockResolvedValueOnce({ rows: [row1, row2], rowCount: 2 } as never);

      const result = await repo.findByYear(2026);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('hol-001');
      expect(result[0].name).toBe("New Year's Day");
      expect(result[1].id).toBe('hol-002');
      expect(result[1].name).toBe('Christmas Day');
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM holidays WHERE EXTRACT(YEAR FROM date) = $1 ORDER BY date',
        [2026],
      );
    });

    it('should return an empty array when no holidays exist for the year', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const result = await repo.findByYear(2027);

      expect(result).toEqual([]);
    });

    it('should reject on a pool error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Query timeout'));

      await expect(repo.findByYear(2026)).rejects.toThrow('Query timeout');
    });
  });
});
