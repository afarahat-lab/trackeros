import { Result } from '../../modules/Utils/result';

/**
 * Converts a given string into a URL-safe slug.
 * Replaces spaces and special characters with hyphens, and converts to lowercase.
 *
 * @param input The input string to be slugified.
 * @returns A Result containing the slugified string or an error.
 */
export function slugify(input: string): Result<string, Error> {
  try {
    if (typeof input !== 'string') {
      throw new Error('Input must be a string');
    }

    const slug = input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric characters with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading and trailing hyphens

    return { success: true, data: slug };
  } catch (error) {
    return { success: false, error };
  }
}
