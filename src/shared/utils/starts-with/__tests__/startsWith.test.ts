import { describe, it, expect } from 'vitest';
import { startsWith } from '../startsWith';

describe('SC-1: startsWith utility function', () => {
  it('should return true when the string starts with the given prefix', () => {
    const result = startsWith('hello world', 'hello');
    expect(result).toBe(true);
  });

  it('should return false when the string does not start with the given prefix', () => {
    const result = startsWith('hello world', 'world');
    expect(result).toBe(false);
  });

  it('should return false when the prefix is longer than the string', () => {
    const result = startsWith('hi', 'hello');
    expect(result).toBe(false);
  });

  it('should return true when both the string and prefix are empty', () => {
    const result = startsWith('', '');
    expect(result).toBe(true);
  });

  it('should return false when the string is empty and prefix is not', () => {
    const result = startsWith('', 'prefix');
    expect(result).toBe(false);
  });

  it('should return true when the string is equal to the prefix', () => {
    const result = startsWith('test', 'test');
    expect(result).toBe(true);
  });

  it('should handle special characters correctly', () => {
    const result = startsWith('!@#$%^&*()', '!@#');
    expect(result).toBe(true);
  });

  it('should be case-sensitive', () => {
    const result = startsWith('Hello World', 'hello');
    expect(result).toBe(false);
  });
});
