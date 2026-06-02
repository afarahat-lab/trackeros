import { describe, it, expect } from 'vitest';
import { trimStart } from '../trimStart';

describe('SC-1: trimStart utility', () => {
  it('should remove leading whitespace from a string', () => {
    const input = '   Hello, World!';
    const expectedOutput = 'Hello, World!';
    expect(trimStart(input)).toBe(expectedOutput);
  });

  it('should return the same string if there is no leading whitespace', () => {
    const input = 'Hello, World!';
    const expectedOutput = 'Hello, World!';
    expect(trimStart(input)).toBe(expectedOutput);
  });

  it('should return an empty string if input is only whitespace', () => {
    const input = '   ';
    const expectedOutput = '';
    expect(trimStart(input)).toBe(expectedOutput);
  });

  it('should handle empty string input', () => {
    const input = '';
    const expectedOutput = '';
    expect(trimStart(input)).toBe(expectedOutput);
  });

  it('should not alter strings with only non-whitespace characters', () => {
    const input = 'NoLeadingWhitespace';
    const expectedOutput = 'NoLeadingWhitespace';
    expect(trimStart(input)).toBe(expectedOutput);
  });

  it('should handle strings with mixed whitespace and non-whitespace characters', () => {
    const input = ' \t\n Mixed whitespace';
    const expectedOutput = 'Mixed whitespace';
    expect(trimStart(input)).toBe(expectedOutput);
  });
});
