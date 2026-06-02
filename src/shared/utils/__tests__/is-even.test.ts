import { describe, it, expect } from 'vitest';
import { isEven } from '../is-even';

describe('SC-1: isEven utility function', () => {
  it('should return true for even numbers', () => {
    expect(isEven(2)).toBe(true);
    expect(isEven(0)).toBe(true);
    expect(isEven(-4)).toBe(true);
  });

  it('should return false for odd numbers', () => {
    expect(isEven(1)).toBe(false);
    expect(isEven(-3)).toBe(false);
  });

  it('should handle edge cases correctly', () => {
    expect(isEven(Number.MAX_SAFE_INTEGER)).toBe(false);
    expect(isEven(Number.MIN_SAFE_INTEGER)).toBe(false);
  });
});
