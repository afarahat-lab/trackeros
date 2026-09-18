const utcDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'UTC',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function formatUtcDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return utcDateFormatter.format(date);
}

export function parseUtcDate(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(value + 'T00:00:00Z');
  }
  return new Date(value);
}
