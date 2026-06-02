/**
 * Pads the beginning of a string to the specified length with the given character.
 * 
 * @param s - The string to pad.
 * @param length - The target length of the resulting string.
 * @param char - The character to pad with. Defaults to a space.
 * @returns The padded string.
 */
export function padStart(s: string, length: number, char: string = ' '): string {
  if (s.length >= length) {
    return s;
  }
  const padding = char.repeat(length - s.length);
  return padding.slice(0, length - s.length) + s;
}
