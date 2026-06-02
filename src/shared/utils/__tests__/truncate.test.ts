import { describe, it, expect } from 'vitest';
import { truncate } from '../truncate';

describe('SC-1: truncate utility function', () => {
  it('should return the original string if it is shorter than the max length', () => {
    const result = truncate('short', 10);
    expect(result).toBe('short');
  });

  it('should truncate the string and add ellipsis if it is longer than the max length', () => {
    const result = truncate('this is a long string', 10);
    expect(result).toBe('this is a ...');
  });

  it('should handle empty strings', () => {
    const result = truncate('', 10);
    expect(result).toBe('');
  });

  it('should handle max length of zero', () => {
    const result = truncate('some string', 0);
    expect(result).toBe('...');
  });

  it('should return the original string if max length is equal to string length', () => {
    const result = truncate('exact length', 12);
    expect(result).toBe('exact length');
  });

  it('should handle strings with special characters', () => {
    const result = truncate('special!@#$', 8);
    expect(result).toBe('special...');
  });

  it('should handle strings with spaces correctly', () => {
    const result = truncate('   ', 2);
    expect(result).toBe(' ...');
  });
});
