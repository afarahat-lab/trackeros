/**
 * Trims leading whitespace from a string.
 * 
 * @param input - The string to trim.
 * @returns A new string with leading whitespace removed.
 */
export function trimStart(input: string): string {
  return input.replace(/^\s+/, '');
}
