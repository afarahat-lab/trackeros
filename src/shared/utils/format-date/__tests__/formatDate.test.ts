import { describe, it, expect } from 'vitest';
import { formatDate } from '../formatDate';

describe('SC-1: formatDate utility function', () => {
  it('should format a valid Date object to YYYY-MM-DD', () => {
    const date = new Date('2023-10-05');
    const formattedDate = formatDate(date);
    expect(formattedDate).toBe('2023-10-05');
  });

  it('should throw an error if the input is not a Date object', () => {
    expect(() => formatDate('invalid-date' as any)).toThrow(TypeError);
  });

  it('should handle leap year dates correctly', () => {
    const leapYearDate = new Date('2024-02-29');
    const formattedDate = formatDate(leapYearDate);
    expect(formattedDate).toBe('2024-02-29');
  });

  it('should handle end of year dates correctly', () => {
    const endOfYearDate = new Date('2023-12-31');
    const formattedDate = formatDate(endOfYearDate);
    expect(formattedDate).toBe('2023-12-31');
  });

  it('should handle beginning of year dates correctly', () => {
    const beginningOfYearDate = new Date('2023-01-01');
    const formattedDate = formatDate(beginningOfYearDate);
    expect(formattedDate).toBe('2023-01-01');
  });
});
