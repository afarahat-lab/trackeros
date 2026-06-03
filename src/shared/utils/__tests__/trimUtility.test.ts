import { describe, it, expect } from 'vitest';
import { trimUtility } from '../trimUtility';

describe('SC-1: trimUtility function', () => {
  it('should trim whitespace from both ends of a string', () => {
    const input = '  hello world  ';
    const expectedOutput = 'hello world';
    expect(trimUtility(input)).toBe(expectedOutput);
  });

  it('should return the same string if there is no whitespace at the ends', () => {
    const input = 'hello world';
    const expectedOutput = 'hello world';
    expect(trimUtility(input)).toBe(expectedOutput);
  });

  it('should handle strings with only whitespace', () => {
    const input = '    ';
    const expectedOutput = '';
    expect(trimUtility(input)).toBe(expectedOutput);
  });

  it('should handle empty strings', () => {
    const input = '';
    const expectedOutput = '';
    expect(trimUtility(input)).toBe(expectedOutput);
  });

  it('should handle strings with no whitespace', () => {
    const input = 'nowhitespace';
    const expectedOutput = 'nowhitespace';
    expect(trimUtility(input)).toBe(expectedOutput);
  });

  it('should handle strings with whitespace only at the start', () => {
    const input = '   start';
    const expectedOutput = 'start';
    expect(trimUtility(input)).toBe(expectedOutput);
  });

  it('should handle strings with whitespace only at the end', () => {
    const input = 'end   ';
    const expectedOutput = 'end';
    expect(trimUtility(input)).toBe(expectedOutput);
  });
});
