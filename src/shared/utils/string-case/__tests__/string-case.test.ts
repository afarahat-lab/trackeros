import { describe, it, expect } from 'vitest';
import { kebabCase } from '../kebabCase';
import { camelCase } from '../camelCase';

describe('SC-1: The module src/shared/utils/string-case contains two pure functions: kebabCase and camelCase', () => {
  describe('kebabCase', () => {
    it('should convert camelCase to kebab-case', () => {
      expect(kebabCase('camelCase')).toBe('camel-case');
    });

    it('should convert spaces to dashes', () => {
      expect(kebabCase('hello world')).toBe('hello-world');
    });

    it('should handle mixed cases and spaces', () => {
      expect(kebabCase('Hello WorldTest')).toBe('hello-world-test');
    });

    it('should handle empty strings', () => {
      expect(kebabCase('')).toBe('');
    });

    it('should handle strings with no spaces or uppercase letters', () => {
      expect(kebabCase('simple')).toBe('simple');
    });
  });

  describe('camelCase', () => {
    it('should convert kebab-case to camelCase', () => {
      expect(camelCase('kebab-case')).toBe('kebabCase');
    });

    it('should convert spaces to camelCase', () => {
      expect(camelCase('hello world')).toBe('helloWorld');
    });

    it('should handle mixed cases and spaces', () => {
      expect(camelCase('Hello World-Test')).toBe('helloWorldTest');
    });

    it('should handle empty strings', () => {
      expect(camelCase('')).toBe('');
    });

    it('should handle strings with no dashes or spaces', () => {
      expect(camelCase('simple')).toBe('simple');
    });
  });
});
