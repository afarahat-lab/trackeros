import { formatIsoDate, parseIsoDate } from './date-utils';

describe('date-utils', () => {
  describe('formatIsoDate', () => {
    it('should format a Date object to an ISO string', () => {
      const date = new Date('2023-10-01T12:00:00Z');
      const formatted = formatIsoDate(date);
      expect(formatted).toBe('2023-10-01T12:00:00Z');
    });
  });

  describe('parseIsoDate', () => {
    it('should parse a valid ISO string to a Date object', () => {
      const isoString = '2023-10-01T12:00:00Z';
      const date = parseIsoDate(isoString);
      expect(date).toEqual(new Date(isoString));
    });

    it('should return null for an invalid ISO string', () => {
      const invalidString = 'invalid-date';
      const date = parseIsoDate(invalidString);
      expect(date).toBeNull();
    });
  });
});
