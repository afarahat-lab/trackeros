import { describe, it, expect } from 'vitest';
import { isNonEmpty } from '../isNonEmpty';

describe('SC-1: isNonEmpty utility function', () => {
  it('should return true for non-empty strings', () => {
    expect(isNonEmpty('hello')).toBe(true);
  });

  it('should return false for empty strings', () => {
    expect(isNonEmpty('')).toBe(false);
  });

  it('should return true for strings with spaces', () => {
    expect(isNonEmpty(' ')).toBe(true);
  });

  it('should return true for strings with special characters', () => {
    expect(isNonEmpty('!@#$')).toBe(true);
  });

  it('should return true for strings with numbers', () => {
    expect(isNonEmpty('123')).toBe(true);
  });
});
