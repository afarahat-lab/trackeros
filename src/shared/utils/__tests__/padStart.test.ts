import { describe, it, expect } from 'vitest';
import { padStart } from '../padStart';

describe('SC-1: padStart function', () => {
  it('should return the original string if it is already the target length or longer', () => {
    expect(padStart('hello', 5)).toBe('hello');
    expect(padStart('hello', 3)).toBe('hello');
  });

  it('should pad the string with spaces by default if no character is provided', () => {
    expect(padStart('hi', 5)).toBe('   hi');
  });

  it('should pad the string with the specified character', () => {
    expect(padStart('hi', 5, '*')).toBe('***hi');
    expect(padStart('hi', 6, '0')).toBe('0000hi');
  });

  it('should handle empty strings correctly', () => {
    expect(padStart('', 3)).toBe('   ');
    expect(padStart('', 3, '-')).toBe('---');
  });

  it('should return the original string if the target length is zero or negative', () => {
    expect(padStart('hi', 0)).toBe('hi');
    expect(padStart('hi', -1)).toBe('hi');
  });

  it('should handle non-standard characters correctly', () => {
    expect(padStart('hi', 5, '🙂')).toBe('🙂🙂🙂hi');
  });
});
