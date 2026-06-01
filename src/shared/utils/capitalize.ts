import { Result } from '../types/Result';

/**
 * Capitalizes the first character of the input string.
 *
 * @param s - The string to capitalize.
 * @returns A Result object containing the capitalized string or an error.
 */
export function capitalize(s: string): Result<string, Error> {
  if (s.length === 0) {
    return { success: false, error: new Error('Input string cannot be empty') };
  }

  const capitalized = s.charAt(0).toUpperCase() + s.slice(1);
  return { success: true, value: capitalized };
}
