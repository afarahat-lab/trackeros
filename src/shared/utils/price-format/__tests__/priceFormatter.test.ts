import { describe, it, expect } from 'vitest';
import { formatPrice } from '../priceFormatter';


describe('SC-1: The price-formatter utility', () => {
  it('should format cents to a string representation correctly', () => {
    const result = formatPrice(12345);
    expect(result.success).toBe(true);
    expect(result.value).toBe('$123.45');
  });

  it('should return an error for non-number input', () => {
    const result = formatPrice(NaN);
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).toBe('Invalid input: cents must be a number');
  });

  it('should return an error for non-numeric input', () => {
    const result = formatPrice('abc' as unknown as number);
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).toBe('Invalid input: cents must be a number');
  });
});
