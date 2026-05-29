import { parseISO, formatISO } from 'date-fns';

/**
 * Formats a Date object into an ISO 8601 string.
 *
 * @param date - The Date object to format.
 * @returns The ISO 8601 formatted string.
 */
export function formatIsoDate(date: Date): string {
  return formatISO(date);
}

/**
 * Parses an ISO 8601 string into a Date object.
 *
 * @param s - The ISO 8601 string to parse.
 * @returns The parsed Date object, or null if parsing fails.
 */
export function parseIsoDate(s: string): Date | null {
  try {
    return parseISO(s);
  } catch {
    return null;
  }
}
