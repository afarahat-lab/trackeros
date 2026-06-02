/*
 * Checks if a string ends with the given suffix.
 *
 * @param str - The string to check.
 * @param suffix - The suffix to look for.
 * @returns A boolean indicating whether the string ends with the suffix.
 */
export function endsWith(str: string, suffix: string): boolean {
  return str.slice(-suffix.length) === suffix;
}
