import { execFileSync } from 'child_process';
import { ConflictError } from '../../../src/shared/errors';
import {
  startOfUtcDay,
  addMonths,
  periodContaining,
} from '../../../src/shared/date/accrual';

describe('startOfUtcDay', () => {
  it('returns UTC midnight of the input UTC calendar day', () => {
    const input = new Date(Date.UTC(2024, 2, 15, 14, 30, 45, 123));
    const result = startOfUtcDay(input);
    expect(result.getTime()).toBe(Date.UTC(2024, 2, 15));
    expect(result.getUTCFullYear()).toBe(2024);
    expect(result.getUTCMonth()).toBe(2);
    expect(result.getUTCDate()).toBe(15);
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCSeconds()).toBe(0);
    expect(result.getUTCMilliseconds()).toBe(0);
  });

  it('does not mutate its input', () => {
    const input = new Date(Date.UTC(2024, 2, 15, 18, 45, 30));
    const before = input.getTime();
    startOfUtcDay(input);
    expect(input.getTime()).toBe(before);
  });
});

describe('addMonths', () => {
  it('advances the UTC month by the given count', () => {
    const input = new Date(Date.UTC(2024, 0, 15, 10, 20, 30));
    const result = addMonths(input, 3);
    expect(result.getUTCFullYear()).toBe(2024);
    expect(result.getUTCMonth()).toBe(3);
    expect(result.getUTCDate()).toBe(15);
    // Preserves the time-of-day components from the input.
    expect(result.getUTCHours()).toBe(10);
  });

  it('carries across the year boundary', () => {
    const result = addMonths(new Date(Date.UTC(2024, 11, 10)), 1);
    expect(result.getUTCFullYear()).toBe(2025);
    expect(result.getUTCMonth()).toBe(0);
    expect(result.getUTCDate()).toBe(10);
  });

  it('clamps the day to the last day of the target month', () => {
    const result = addMonths(new Date(Date.UTC(2024, 0, 31)), 1);
    expect(result.getUTCFullYear()).toBe(2024);
    expect(result.getUTCMonth()).toBe(1);
    expect(result.getUTCDate()).toBe(29); // Feb 2024 is a leap year.
  });

  it('clamps the day across a leap-year boundary onto a non-leap February', () => {
    const result = addMonths(new Date(Date.UTC(2024, 1, 29)), 12);
    expect(result.getUTCFullYear()).toBe(2025);
    expect(result.getUTCMonth()).toBe(1);
    expect(result.getUTCDate()).toBe(28); // Feb 2025 is not a leap year.
  });

  it('does not mutate its input', () => {
    const input = new Date(Date.UTC(2024, 0, 31));
    const before = input.getTime();
    addMonths(input, 1);
    expect(input.getTime()).toBe(before);
  });
});

describe('periodContaining', () => {
  it('returns the half-open period containing the date', () => {
    const anchor = new Date(Date.UTC(2024, 0, 10));
    const date = new Date(Date.UTC(2024, 4, 5));
    const { start, end } = periodContaining(anchor, 3, date);

    // Jan 10 -> Apr 10 -> Jul 10; May 5 falls in the Apr 10 — Jul 10 period.
    expect(start.getTime()).toBe(Date.UTC(2024, 3, 10));
    expect(end.getTime()).toBe(Date.UTC(2024, 6, 10));
    expect(date.getTime()).toBeGreaterThanOrEqual(start.getTime());
    expect(date.getTime()).toBeLessThan(end.getTime());
  });

  it('treats the period start as inclusive and the end as exclusive', () => {
    const anchor = new Date(Date.UTC(2024, 0, 1));
    const start = new Date(Date.UTC(2024, 0, 1));
    expect(periodContaining(anchor, 1, start)).toEqual({
      start: new Date(Date.UTC(2024, 0, 1)),
      end: new Date(Date.UTC(2024, 1, 1)),
    });
    // A date exactly equal to the end boundary belongs to the next period.
    const end = new Date(Date.UTC(2024, 1, 1));
    expect(periodContaining(anchor, 1, end)).toEqual({
      start: new Date(Date.UTC(2024, 1, 1)),
      end: new Date(Date.UTC(2024, 2, 1)),
    });
  });

  it('anchors the first period at UTC midnight of the anchor', () => {
    const anchor = new Date(Date.UTC(2024, 5, 20, 12, 0, 0));
    const date = new Date(Date.UTC(2024, 5, 20, 13, 0, 0));
    const { start } = periodContaining(anchor, 1, date);
    expect(start.getTime()).toBe(Date.UTC(2024, 5, 20));
  });

  it('steps using addMonths month-end clamping', () => {
    const anchor = new Date(Date.UTC(2024, 7, 31));
    // Aug 31 -> Sep 30 (clamped); Sep 30 lands exactly on that boundary, so it
    // falls in the next period Sep 30 -> Oct 30.
    const date = new Date(Date.UTC(2024, 8, 30));
    const { start, end } = periodContaining(anchor, 1, date);
    expect(start.getTime()).toBe(Date.UTC(2024, 8, 30));
    expect(end.getTime()).toBe(Date.UTC(2024, 9, 30));
  });

  it('throws ConflictError when the date precedes the anchor', () => {
    const anchor = new Date(Date.UTC(2024, 0, 10));
    const date = new Date(Date.UTC(2024, 0, 9));
    expect(() => periodContaining(anchor, 3, date)).toThrow(ConflictError);
    try {
      periodContaining(anchor, 3, date);
    } catch (err) {
      expect(err).toBeInstanceOf(ConflictError);
      expect((err as ConflictError).statusCode).toBe(409);
      expect((err as ConflictError).code).toBe('CONFLICT');
    }
  });

  it('throws ConflictError when no period resolves within the iteration bound', () => {
    const anchor = new Date(Date.UTC(2000, 0, 1));
    // 0-month steps never advance, so the date can never be contained.
    const date = new Date(Date.UTC(2024, 0, 1));
    expect(() => periodContaining(anchor, 0, date)).toThrow(ConflictError);
  });
});

describe('non-UTC (timezone) independence', () => {
  // The helpers must read only UTC fields, so their results are identical
  // regardless of the process timezone. We prove that by evaluating the same
  // assertions inside a child process running under TZ=Asia/Riyadh: had any
  // helper read local fields, the results would differ and the child would
  // exit non-zero.
  it('startOfUtcDay, addMonths, and periodContaining are TZ-independent', () => {
    const script = `
      require('ts-node/register');
      const { startOfUtcDay, addMonths, periodContaining } = require('./src/shared/date/accrual');
      const assert = (cond, msg) => { if (!cond) { throw new Error(msg); } };

      assert(startOfUtcDay(new Date('2024-03-15T01:30:00.000Z')).getTime() === Date.UTC(2024, 2, 15), 'startOfUtcDay');

      // May 31 + 1 month -> June 30 (May=4, June=5); day clamped to June's 30.
      const m = addMonths(new Date('2024-05-31T22:30:00.000Z'), 1);
      assert(m.getUTCFullYear() === 2024 && m.getUTCMonth() === 5 && m.getUTCDate() === 30, 'addMonths');

      const p = periodContaining(new Date('2024-01-31T21:00:00.000Z'), 1, new Date('2024-03-01T00:00:00.000Z'));
      assert(p.start.getTime() === Date.UTC(2024, 1, 29), 'periodContaining.start');
      assert(p.end.getTime() === Date.UTC(2024, 2, 29), 'periodContaining.end');

      console.log('TZ_INDEPENDENT_OK');
    `;
    const out = execFileSync(process.execPath, ['-e', script], {
      encoding: 'utf8',
      cwd: process.cwd(),
      env: { ...process.env, TZ: 'Asia/Riyadh' },
    });
    expect(out.trim()).toContain('TZ_INDEPENDENT_OK');
  });
});
