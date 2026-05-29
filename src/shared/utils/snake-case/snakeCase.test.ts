import { snakeCase } from './snakeCase';

describe('snakeCase', () => {
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

  it('should handle strings with consecutive uppercase letters', () => {
    expect(snakeCase('XMLHttpRequest')).toBe('xml_http_request');
  });

  it('should not prepend underscore for leading uppercase letter', () => {
    expect(snakeCase('CamelCase')).toBe('camel_case');
  });
});
