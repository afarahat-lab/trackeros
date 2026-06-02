import { describe, it, expect } from 'vitest';
import { isPositive } from '../is-positive';

describe('SC-1: isPositive utility function', () => {
  it('should return true for positive numbers', () => {
    expect(isPositive(1)).toBe(true);
    expect(isPositive(100)).toBe(true);
    expect(isPositive(0.1)).toBe(true);
  });

  it('should return false for zero', () => {
    expect(isPositive(0)).toBe(false);
  });

  it('should return false for negative numbers', () => {
    expect(isPositive(-1)).toBe(false);
    expect(isPositive(-100)).toBe(false);
    expect(isPositive(-0.1)).toBe(false);
  });

  it('should handle edge cases correctly', () => {
    expect(isPositive(Number.MIN_VALUE)).toBe(true); // Smallest positive number
    expect(isPositive(-Number.MIN_VALUE)).toBe(false); // Smallest negative number
  });
});
