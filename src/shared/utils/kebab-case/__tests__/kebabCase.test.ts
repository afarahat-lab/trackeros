import { describe, it, expect } from 'vitest';
import { kebabCase } from '../kebabCase';

describe('SC-1: kebabCase utility function', () => {
  it('should convert camelCase to kebab-case', () => {
    const input = 'camelCaseString';
    const expectedOutput = 'camel-case-string';
    expect(kebabCase(input)).toBe(expectedOutput);
  });

  it('should convert space-separated words to kebab-case', () => {
    const input = 'space separated words';
    const expectedOutput = 'space-separated-words';
    expect(kebabCase(input)).toBe(expectedOutput);
  });

  it('should handle strings with multiple spaces correctly', () => {
    const input = 'multiple   spaces';
    const expectedOutput = 'multiple-spaces';
    expect(kebabCase(input)).toBe(expectedOutput);
  });

  it('should convert PascalCase to kebab-case', () => {
    const input = 'PascalCaseString';
    const expectedOutput = 'pascal-case-string';
    expect(kebabCase(input)).toBe(expectedOutput);
  });

  it('should handle empty strings', () => {
    const input = '';
    const expectedOutput = '';
    expect(kebabCase(input)).toBe(expectedOutput);
  });

  it('should handle strings with special characters', () => {
    const input = 'special@#characters!';
    const expectedOutput = 'special@#characters!';
    expect(kebabCase(input)).toBe(expectedOutput);
  });

  it('should handle strings with numbers', () => {
    const input = 'stringWith123Numbers';
    const expectedOutput = 'string-with123-numbers';
    expect(kebabCase(input)).toBe(expectedOutput);
  });
});
