import { describe, it, expect } from 'vitest';
import { formatBytes } from '../../shared/utils/format-bytes';

describe('SC-1: formatBytes utility function', () => {
  it('should return "0 Bytes" when input is 0', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
  });

  it('should correctly format bytes to KB', () => {
    expect(formatBytes(1024)).toBe('1 KB');
  });

  it('should correctly format bytes to MB', () => {
    expect(formatBytes(1048576)).toBe('1 MB');
  });

  it('should correctly format bytes to GB', () => {
    expect(formatBytes(1073741824)).toBe('1 GB');
  });

  it('should correctly format bytes with specified decimals', () => {
    expect(formatBytes(1024, 3)).toBe('1.000 KB');
  });

  it('should handle negative decimal input by defaulting to 0 decimals', () => {
    expect(formatBytes(1024, -1)).toBe('1 KB');
  });

  it('should handle large byte values correctly', () => {
    expect(formatBytes(1125899906842624)).toBe('1 PB');
  });

  it('should handle non-integer byte values', () => {
    expect(formatBytes(1234)).toBe('1.21 KB');
  });
});
