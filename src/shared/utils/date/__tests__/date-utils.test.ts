import { describe, it, expect, vi } from 'vitest';
import { formatIsoDate, parseIsoDate } from '../date-utils';

// SC-1: A utility module exists under src/shared/utils/date with the functions formatIsoDate and parseIsoDate correctly implemented.
describe('SC-1: Utility module implementation', () => {
  describe('formatIsoDate', () => {
    it('should format a Date object to an ISO string', () => {
      const date = new Date('2023-10-01T12:00:00Z');
      const formatted = formatIsoDate(date);
      expect(formatted).toBe('2023-10-01T12:00:00Z');
    });

    it('should throw an error when an invalid Date object is provided', () => {
      const invalidDate = new Date('invalid-date');
      expect(() => formatIsoDate(invalidDate)).toThrow();
    });
  });

  describe('parseIsoDate', () => {
    it('should parse a valid ISO string to a Date object', () => {
      const isoString = '2023-10-01T12:00:00Z';
      const date = parseIsoDate(isoString);
      expect(date).toEqual(new Date('2023-10-01T12:00:00Z'));
    });

    it('should return null for an invalid ISO string', () => {
      const invalidIsoString = 'invalid-iso-string';
      const date = parseIsoDate(invalidIsoString);
      expect(date).toBeNull();
    });
  });
});

// SC-2: Unit tests exist and pass for both formatIsoDate and parseIsoDate functions.
describe('SC-2: Unit tests for utility functions', () => {
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
      expect(date).toEqual(new Date('2023-10-01T12:00:00Z'));
    });
  });
});
