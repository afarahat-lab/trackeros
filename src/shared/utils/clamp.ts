/*
 * Clamps a number to the inclusive range specified by the min and max bounds.
 *
 * @param n - The number to clamp.
 * @param min - The lower bound of the range.
 * @param max - The upper bound of the range.
 * @returns The clamped number.
 */
export function clamp(n: number, min: number, max: number): number {
  if (n < min) return min;
  if (n > max) return max;
  return n;
}
