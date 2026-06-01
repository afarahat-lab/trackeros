import { describe, it, expect } from 'vitest';
import { trimEnd } from '../trimEnd';

describe('SC-1: The trimEnd utility correctly strips trailing whitespace from a string', () => {
  it('should remove trailing whitespace from a string', () => {
    expect(trimEnd('hello world   ')).toBe('hello world');
  });

  it('should return the same string if there is no trailing whitespace', () => {
    expect(trimEnd('hello world')).toBe('hello world');
  });

  it('should handle empty strings', () => {
    expect(trimEnd('')).toBe('');
  });

  it('should handle strings with only whitespace', () => {
    expect(trimEnd('   ')).toBe('');
  });

  it('should not alter strings with internal whitespace', () => {
    expect(trimEnd('  hello   world  ')).toBe('  hello   world');
  });
});
