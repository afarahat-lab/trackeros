import { countBusinessDays } from '../../../../src/shared/utils/business-days';

describe('countBusinessDays', () => {
  describe('weekday range with no holidays', () => {
    it('should count all weekdays in a Monday-to-Friday range', () => {
      // Mon 2026-08-03 to Fri 2026-08-07 = 4 business days (exclusive end)
      const start = new Date('2026-08-03T00:00:00Z');
      const end = new Date('2026-08-07T00:00:00Z');
      expect(countBusinessDays(start, end, [])).toBe(4);
    });

    it('should count a single weekday as 0 (same-day)', () => {
      const start = new Date('2026-08-03T00:00:00Z');
      const end = new Date('2026-08-03T00:00:00Z');
      expect(countBusinessDays(start, end, [])).toBe(0);
    });

    it('should count a Monday-to-Tuesday range as 1', () => {
      const start = new Date('2026-08-03T00:00:00Z');
      const end = new Date('2026-08-04T00:00:00Z');
      expect(countBusinessDays(start, end, [])).toBe(1);
    });
  });

  describe('range spanning a weekend', () => {
    it('should exclude Saturday and Sunday from a Friday-to-Monday range', () => {
      // Fri 2026-08-07 to Mon 2026-08-10 = Fri only (1 business day)
      const start = new Date('2026-08-07T00:00:00Z');
      const end = new Date('2026-08-10T00:00:00Z');
      expect(countBusinessDays(start, end, [])).toBe(1);
    });

    it('should exclude weekends in a two-week range', () => {
      // Mon 2026-08-03 to Mon 2026-08-17 = 10 business days (2 full weeks)
      const start = new Date('2026-08-03T00:00:00Z');
      const end = new Date('2026-08-17T00:00:00Z');
      expect(countBusinessDays(start, end, [])).toBe(10);
    });
  });

  describe('range with holidays', () => {
    it('should exclude a holiday that falls on a weekday', () => {
      // Mon 2026-08-03 to Fri 2026-08-07 with Wed as holiday = 3 business days
      const start = new Date('2026-08-03T00:00:00Z');
      const end = new Date('2026-08-07T00:00:00Z');
      const holidays = [new Date('2026-08-05T00:00:00Z')];
      expect(countBusinessDays(start, end, holidays)).toBe(3);
    });

    it('should not double-count a holiday that falls on a weekend', () => {
      // Mon 2026-08-03 to Mon 2026-08-10 with Sat as holiday = 5 business days
      const start = new Date('2026-08-03T00:00:00Z');
      const end = new Date('2026-08-10T00:00:00Z');
      const holidays = [new Date('2026-08-08T00:00:00Z')]; // Saturday
      expect(countBusinessDays(start, end, holidays)).toBe(5);
    });

    it('should normalize holiday dates to UTC midnight for comparison', () => {
      // Same as above but holiday has a time component
      const start = new Date('2026-08-03T00:00:00Z');
      const end = new Date('2026-08-07T00:00:00Z');
      const holidays = [new Date('2026-08-05T15:30:00Z')];
      expect(countBusinessDays(start, end, holidays)).toBe(3);
    });
  });

  describe('same-day (zero days)', () => {
    it('should return 0 for same-day on a weekday', () => {
      const start = new Date('2026-08-03T00:00:00Z');
      const end = new Date('2026-08-03T00:00:00Z');
      expect(countBusinessDays(start, end, [])).toBe(0);
    });

    it('should return 0 for same-day on a weekend', () => {
      const start = new Date('2026-08-08T00:00:00Z'); // Saturday
      const end = new Date('2026-08-08T00:00:00Z');
      expect(countBusinessDays(start, end, [])).toBe(0);
    });

    it('should return 0 for same-day on a holiday', () => {
      const start = new Date('2026-08-05T00:00:00Z');
      const end = new Date('2026-08-05T00:00:00Z');
      const holidays = [new Date('2026-08-05T00:00:00Z')];
      expect(countBusinessDays(start, end, holidays)).toBe(0);
    });
  });

  describe('end-before-start (error)', () => {
    it('should throw an Error when endDate is before startDate', () => {
      const start = new Date('2026-08-07T00:00:00Z');
      const end = new Date('2026-08-03T00:00:00Z');
      expect(() => countBusinessDays(start, end, [])).toThrow(Error);
    });

    it('should throw with a descriptive message', () => {
      const start = new Date('2026-08-07T00:00:00Z');
      const end = new Date('2026-08-03T00:00:00Z');
      expect(() => countBusinessDays(start, end, [])).toThrow('endDate must not be before startDate');
    });
  });

  describe('normalization behavior', () => {
    it('should normalize start and end dates to UTC midnight', () => {
      // Times within the same day should not affect the count
      const start = new Date('2026-08-03T12:00:00Z');
      const end = new Date('2026-08-04T06:00:00Z');
      expect(countBusinessDays(start, end, [])).toBe(1);
    });
  });
});
