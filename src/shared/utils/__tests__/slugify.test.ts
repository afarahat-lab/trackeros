import { describe, it, expect } from 'vitest';
import { slugify } from '../slugify';
import { Result } from '../../modules/Utils/result';

describe('SC-1: slugify utility function', () => {
  it('should convert a simple string to a slug', () => {
    const input = 'Hello World';
    const expectedOutput = 'hello-world';
    const result: Result<string, Error> = slugify(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(expectedOutput);
    }
  });

  it('should handle strings with special characters', () => {
    const input = 'Hello, World!';
    const expectedOutput = 'hello-world';
    const result: Result<string, Error> = slugify(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(expectedOutput);
    }
  });

  it('should handle strings with multiple spaces', () => {
    const input = 'Hello    World';
    const expectedOutput = 'hello-world';
    const result: Result<string, Error> = slugify(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(expectedOutput);
    }
  });

  it('should convert uppercase letters to lowercase', () => {
    const input = 'HELLO WORLD';
    const expectedOutput = 'hello-world';
    const result: Result<string, Error> = slugify(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(expectedOutput);
    }
  });

  it('should return an error if input is not a string', () => {
    const input = 12345;
    const result: Result<string, Error> = slugify(input as unknown as string);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('Input must be a string');
    }
  });
});
