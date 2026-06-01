import { describe, it, expect } from 'vitest';
import { padLeft } from '../pad-left';
import { Result } from '../../result';

describe('SC-1: padLeft utility', () => {
  it('should correctly pad a string to the specified target length with default pad character', () => {
    const result = padLeft('test', 6);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBe('  test');
    }
  });

  it('should correctly pad a string to the specified target length with a specified pad character', () => {
    const result = padLeft('test', 6, '*');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBe('**test');
    }
  });

  it('should return the original string if target length is less than or equal to the string length', () => {
    const result = padLeft('test', 4);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBe('test');
    }
  });

  it('should return an error if target length is negative', () => {
    const result = padLeft('test', -1);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(Error);
    }
  });

  it('should return an error if padChar is an empty string', () => {
    const result = padLeft('test', 6, '');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(Error);
    }
  });
});
