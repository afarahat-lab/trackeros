import { describe, it, expect } from 'vitest';
import { padStart } from '../pad-start';

// SC-1: The padStart utility correctly left-pads a string to the specified target length.
describe('padStart', () => {
  it('should pad the string with spaces by default', () => {
    const result = padStart('test', 6);
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe('  test');
  });

  it('should pad the string with the specified padString', () => {
    const result = padStart('test', 8, '0');
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe('0000test');
  });

  it('should return the original string if targetLength is less than or equal to input length', () => {
    const result = padStart('test', 4);
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe('test');
  });

  it('should return an error if targetLength is negative', () => {
    const result = padStart('test', -1);
    expect(result.isErr()).toBe(true);
  });

  it('should return an error if padString is an empty string', () => {
    const result = padStart('test', 8, '');
    expect(result.isErr()).toBe(true);
  });
});
