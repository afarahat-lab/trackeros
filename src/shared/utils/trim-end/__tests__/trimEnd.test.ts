import { describe, it, expect } from 'vitest';
import { trimEnd } from '../trimEnd';

describe('SC-1: trimEnd utility function', () => {
  it('should remove trailing whitespace from a string', () => {
    const input = 'Hello, World!   ';
    const expectedOutput = 'Hello, World!';
    const result = trimEnd(input);
    expect(result).toBe(expectedOutput);
  });

  it('should return the same string if there is no trailing whitespace', () => {
    const input = 'Hello, World!';
    const expectedOutput = 'Hello, World!';
    const result = trimEnd(input);
    expect(result).toBe(expectedOutput);
  });

  it('should return an empty string if the input is only whitespace', () => {
    const input = '   ';
    const expectedOutput = '';
    const result = trimEnd(input);
    expect(result).toBe(expectedOutput);
  });

  it('should handle an empty string input', () => {
    const input = '';
    const expectedOutput = '';
    const result = trimEnd(input);
    expect(result).toBe(expectedOutput);
  });

  it('should not alter strings with only leading whitespace', () => {
    const input = '   Hello, World!';
    const expectedOutput = '   Hello, World!';
    const result = trimEnd(input);
    expect(result).toBe(expectedOutput);
  });

  it('should handle strings with mixed whitespace characters', () => {
    const input = 'Hello, World! \t\n';
    const expectedOutput = 'Hello, World!';
    const result = trimEnd(input);
    expect(result).toBe(expectedOutput);
  });
});
