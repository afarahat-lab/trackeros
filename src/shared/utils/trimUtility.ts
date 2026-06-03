// src/shared/utils/trimUtility.ts

/**
 * A utility service that trims whitespace from both ends of a string using regex.
 * @param inputString - The string to be trimmed.
 * @returns The trimmed string.
 */
export function trimUtility(inputString: string): string {
  return inputString.replace(/^\s+|\s+$/g, '');
}
