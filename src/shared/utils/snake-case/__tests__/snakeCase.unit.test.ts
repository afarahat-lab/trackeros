import { describe, it, expect } from 'vitest';
import { snakeCase } from '../snakeCase';

describe('SC-1: snakeCase Utility Function', () => {
  it('should convert camelCase to snake_case', () => {
    expect(snakeCase('camelCase')).toBe('camel_case');
  });

  it('should convert PascalCase to snake_case', () => {
    expect(snakeCase('PascalCase')).toBe('pascal_case');
  });

  it('should handle strings with no uppercase letters', () => {
    expect(snakeCase('lowercase')).toBe('lowercase');
  });

  it('should handle empty strings', () => {
    expect(snakeCase('')).toBe('');
  });

  it('should handle strings with multiple uppercase letters', () => {
    expect(snakeCase('multipleUpperCaseLetters')).toBe('multiple_upper_case_letters');
  });

  it('should not prepend underscore for leading uppercase letter', () => {
    expect(snakeCase('LeadingUpper')).toBe('leading_upper');
  });
});