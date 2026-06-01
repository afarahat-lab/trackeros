import { Result } from '../../utils/result';

/**
 * Formats a price from cents to a string representation.
 * @param {number} cents - The price in cents.
 * @returns {Result<string, Error>} - The formatted price string or an error.
 */
export function formatPrice(cents: number): Result<string, Error> {
  try {
    if (typeof cents !== 'number' || isNaN(cents)) {
      throw new Error('Invalid input: cents must be a number');
    }
    const dollars = (cents / 100).toFixed(2);
    return { success: true, value: `$${dollars}` };
  } catch (error) {
    return { success: false, error };
  }
}
