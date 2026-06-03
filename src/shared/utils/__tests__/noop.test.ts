import { describe, it, expect } from 'vitest';
import { noop } from '../noop';

describe('SC-1: noop utility function', () => {
  it('should be a function', () => {
    expect(typeof noop).toBe('function');
  });

  it('should do nothing when called', () => {
    expect(noop()).toBeUndefined();
  });
});
