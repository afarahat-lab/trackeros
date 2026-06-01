import { describe, it, expect } from 'vitest';
import { clamp } from '../clamp';

describe('SC-1: The clamp utility function', () => {
  it('should return the number itself if it is within the range', () => {
    expect(clamp(5, 1, 10)).toBe(5);
  });

  it('should return the min if the number is below the range', () => {
    expect(clamp(0, 1, 10)).toBe(1);
  });

  it('should return the max if the number is above the range', () => {
    expect(clamp(15, 1, 10)).toBe(10);
  });

  it('should handle negative numbers correctly', () => {
    expect(clamp(-5, -10, 0)).toBe(-5);
    expect(clamp(-15, -10, 0)).toBe(-10);
    expect(clamp(5, -10, 0)).toBe(0);
  });

  it('should handle edge cases where n equals min or max', () => {
    expect(clamp(1, 1, 10)).toBe(1);
    expect(clamp(10, 1, 10)).toBe(10);
  });

  it('should handle cases where min equals max', () => {
    expect(clamp(5, 5, 5)).toBe(5);
    expect(clamp(10, 5, 5)).toBe(5);
    expect(clamp(0, 5, 5)).toBe(5);
  });
});
