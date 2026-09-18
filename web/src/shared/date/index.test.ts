process.env.TZ = 'Asia/Tokyo';

import { describe, it, expect } from 'vitest';
import { formatUtcDate, parseUtcDate } from './index';

describe('formatUtcDate', () => {
  it('renders the UTC calendar day without host-timezone shift', () => {
    expect(formatUtcDate('2024-03-15')).toBe('2024-03-15');
  });
});

describe('parseUtcDate', () => {
  it('parses a date-only string to the matching UTC components', () => {
    const d = parseUtcDate('2024-03-15');
    expect(d.getUTCDate()).toBe(15);
    expect(d.getUTCMonth()).toBe(2);
    expect(d.getUTCFullYear()).toBe(2024);
  });
});
