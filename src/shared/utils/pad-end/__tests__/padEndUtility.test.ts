import { describe, it, expect } from 'vitest';
import { padEnd } from '../padEndUtility';
import { Ok, Err } from 'neverthrow';

describe('SC-1: The padEnd utility correctly right-pads a string to the specified target length.', () => {
  it('should pad the string with the specified padString when the target length is greater than the input string length', () => {
    const result = padEnd('test', 10, 'x');
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe('testxxxxxx');
  });

  it('should return the original string if it is already the target length', () => {
    const result = padEnd('test', 4, 'x');
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe('test');
  });

  it('should return the original string if the target length is less than the input string length', () => {
    const result = padEnd('test', 2, 'x');
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe('test');
  });

  it('should return an error if the padString is empty and target length is greater than input string length', () => {
    const result = padEnd('test', 10, '');
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(Error);
  });

  it('should return an error if the target length is negative', () => {
    const result = padEnd('test', -1, 'x');
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(Error);
  });
});
