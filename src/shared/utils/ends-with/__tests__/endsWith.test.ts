import { describe, it, expect } from 'vitest';
import { endsWith } from '../endsWith';

describe('SC-1: endsWith utility function', () => {
  it('should return true when the string ends with the given suffix', () => {
    const result = endsWith('hello world', 'world');
    expect(result).toBe(true);
  });

  it('should return false when the string does not end with the given suffix', () => {
    const result = endsWith('hello world', 'hello');
    expect(result).toBe(false);
  });

  it('should return true when the string and suffix are identical', () => {
    const result = endsWith('test', 'test');
    expect(result).toBe(true);
  });

  it('should return false when the suffix is longer than the string', () => {
    const result = endsWith('short', 'longerSuffix');
    expect(result).toBe(false);
  });

  it('should return true when the suffix is an empty string', () => {
    const result = endsWith('anything', '');
    expect(result).toBe(true);
  });

  it('should return false when the string is empty and suffix is not', () => {
    const result = endsWith('', 'nonempty');
    expect(result).toBe(false);
  });

  it('should return true when both the string and suffix are empty', () => {
    const result = endsWith('', '');
    expect(result).toBe(true);
  });
});
