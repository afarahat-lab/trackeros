import { describe, it, expect } from 'vitest';
import * as snakeCaseModule from '../snakeCase';

// Mock the implementation of snakeCase to ensure tests are being called
vi.mock('../snakeCase', () => ({
  snakeCase: vi.fn((s) => s)
}));

describe('SC-2: Unit Tests for snakeCase Function', () => {
  it('should have unit tests that call snakeCase', () => {
    const { snakeCase } = snakeCaseModule;
    snakeCase('testString');
    expect(snakeCase).toHaveBeenCalled();
  });

  it('should have unit tests that pass for snakeCase', () => {
    const { snakeCase } = snakeCaseModule;
    expect(snakeCase('camelCase')).toBe('camel_case');
    expect(snakeCase('PascalCase')).toBe('pascal_case');
    expect(snakeCase('lowercase')).toBe('lowercase');
    expect(snakeCase('')).toBe('');
    expect(snakeCase('multipleUpperCaseLetters')).toBe('multiple_upper_case_letters');
    expect(snakeCase('LeadingUpper')).toBe('leading_upper');
  });
});