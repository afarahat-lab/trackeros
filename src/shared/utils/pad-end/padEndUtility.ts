import { Result, Ok, Err } from 'neverthrow';

/**
 * Pads the input string on the right with the specified padString until the target length is reached.
 * @param inputString - The original string to pad.
 * @param targetLength - The desired length of the resulting string.
 * @param padString - The string to pad with.
 * @returns A Result containing either the padded string or an error.
 */
export function padEnd(inputString: string, targetLength: number, padString: string): Result<string, Error> {
  if (padString === '') {
    return Err(new Error('padString cannot be empty'));
  }

  if (inputString.length >= targetLength) {
    return Ok(inputString);
  }

  const padding = padString.repeat(Math.ceil((targetLength - inputString.length) / padString.length)).slice(0, targetLength - inputString.length);
  return Ok(inputString + padding);
}
