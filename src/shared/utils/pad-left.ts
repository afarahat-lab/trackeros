import { Result } from '../result';

/**
 * Pads the input string on the left with the specified character until the target length is reached.
 *
 * @param input - The string to pad.
 * @param targetLength - The desired length of the output string.
 * @param padChar - The character to pad with. Defaults to a space.
 * @returns A Result object containing either the padded string or an error.
 */
export function padLeft(input: string, targetLength: number, padChar: string = ' '): Result<string, Error> {
  try {
    if (targetLength <= input.length) {
      return { success: true, value: input };
    }
    const padding = padChar.repeat(targetLength - input.length);
    const paddedString = padding + input;
    return { success: true, value: paddedString };
  } catch (error) {
    return { success: false, error: new Error('Failed to pad string') };
  }
}
