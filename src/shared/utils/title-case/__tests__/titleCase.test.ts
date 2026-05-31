import { describe, it, expect } from 'vitest';
import { titleCase } from '../titleCase';

describe('SC-1: titleCase utility function', () => {
  it('should capitalize the first letter of each word and lowercase the rest', () => {
    const input = 'hello world';
    const expectedOutput = 'Hello World';
    expect(titleCase(input)).toBe(expectedOutput);
  });

  it('should handle single word input', () => {
    const input = 'javascript';
    const expectedOutput = 'Javascript';
    expect(titleCase(input)).toBe(expectedOutput);
  });

  it('should handle input with mixed casing', () => {
    const input = 'hElLo WoRLd';
    const expectedOutput = 'Hello World';
    expect(titleCase(input)).toBe(expectedOutput);
  });

  it('should handle input with multiple spaces', () => {
    const input = '  hello   world  ';
    const expectedOutput = 'Hello World';
    expect(titleCase(input)).toBe(expectedOutput);
  });

  it('should handle empty string input', () => {
    const input = '';
    const expectedOutput = '';
    expect(titleCase(input)).toBe(expectedOutput);
  });

  it('should handle input with special characters', () => {
    const input = 'hello-world';
    const expectedOutput = 'Hello-world';
    expect(titleCase(input)).toBe(expectedOutput);
  });

  it('should handle input with numbers', () => {
    const input = 'hello world 123';
    const expectedOutput = 'Hello World 123';
    expect(titleCase(input)).toBe(expectedOutput);
  });
});
