import { describe, it, expect } from 'vitest';
import { capitalize } from '../capitalize';

// Mocking Result type
const mockResultSuccess = (value) => ({ success: true, value });
const mockResultError = (error) => ({ success: false, error });

describe('SC-1: capitalize function', () => {
  it('should capitalize the first character of a non-empty string', () => {
    const input = 'hello';
    const expectedOutput = mockResultSuccess('Hello');
    const result = capitalize(input);
    expect(result).toEqual(expectedOutput);
  });

  it('should return an error for an empty string', () => {
    const input = '';
    const expectedError = new Error('Input string cannot be empty');
    const expectedOutput = mockResultError(expectedError);
    const result = capitalize(input);
    expect(result).toEqual(expectedOutput);
  });

  it('should not change the rest of the string', () => {
    const input = 'hELLO';
    const expectedOutput = mockResultSuccess('HELLO');
    const result = capitalize(input);
    expect(result).toEqual(expectedOutput);
  });

  it('should handle strings with special characters', () => {
    const input = '!hello';
    const expectedOutput = mockResultSuccess('!hello');
    const result = capitalize(input);
    expect(result).toEqual(expectedOutput);
  });

  it('should handle strings with numbers', () => {
    const input = '123abc';
    const expectedOutput = mockResultSuccess('123abc');
    const result = capitalize(input);
    expect(result).toEqual(expectedOutput);
  });
});
