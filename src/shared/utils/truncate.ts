/*
 * Truncates a string to a maximum length, adding an ellipsis if truncated.
 * @param s - The string to truncate.
 * @param max - The maximum length of the truncated string.
 * @returns The truncated string.
 */
export function truncate(s: string, max: number): string {
  if (s.length <= max) {
    return s;
  }
  return s.slice(0, max) + '...';
}
