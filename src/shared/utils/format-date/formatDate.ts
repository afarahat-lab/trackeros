import { format } from 'date-fns';

/**
 * Formats a given Date object into a YYYY-MM-DD string.
 *
 * @param date - The Date object to format.
 * @returns The formatted date string in YYYY-MM-DD format.
 */
export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}
