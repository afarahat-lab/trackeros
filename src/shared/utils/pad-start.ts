import { Result, Ok, Err } from 'neverthrow';

/**
 * Pads the start of a string with a given padString until the target length is reached.
 * @param input - The original string to pad.
 * @param targetLength - The length of the resulting string once the original string has been padded.
 * @param padString - The string to pad the original string with.
 * @returns A Result containing the padded string or an error if input is invalid.
 */
export function padStart(input: string, targetLength: number, padString: string = ' '): Result<string, Error> {
  if (typeof input !== 'string') {
    return Err(new Error('Input must be a string'));
  }
  if (targetLength < 0) {
    return Err(new Error('Target length must be non-negative'));
  }
  if (input.length >= targetLength) {
    return Ok(input);
  }
  const padding = padString.repeat(Math.ceil((targetLength - input.length) / padString.length)).slice(0, targetLength - input.length);
  return Ok(padding + input);
}
