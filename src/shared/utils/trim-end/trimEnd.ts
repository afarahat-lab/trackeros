// src/shared/utils/trim-end/trimEnd.ts

/**
 * Trims trailing whitespace from a string.
 * 
 * @param input - The string to trim.
 * @returns A new string with trailing whitespace removed.
 */
export function trimEnd(input: string): string {
  return input.replace(/\s+$/, '');
}
