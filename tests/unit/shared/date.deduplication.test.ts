import { readFileSync } from 'fs';
import { join } from 'path';
import {
  startOfUtcDay,
  addMonths,
  periodContaining,
} from '../../../src/shared/date';

describe('date helper deduplication pin', () => {
  describe('shared helpers at a period boundary under a non-UTC timezone', () => {
    const originalTZ = process.env.TZ;

    beforeAll(() => {
      process.env.TZ = 'Asia/Riyadh';
    });

    afterAll(() => {
      process.env.TZ = originalTZ;
    });

    it('startOfUtcDay, addMonths, and periodContaining produce expected UTC instants at the boundary', () => {
      const anchor = new Date(Date.UTC(2023, 0, 10));

      // startOfUtcDay is load-bearing: it must key off UTC accessors, so constructing
      // the input with local (Riyadh) getters still resolves to UTC midnight.
      const start = startOfUtcDay(anchor);
      expect(start.getTime()).toBe(Date.UTC(2023, 0, 10));

      // addMonths must operate on the UTC day, unaffected by the process zone.
      expect(addMonths(anchor, 1).getTime()).toBe(Date.UTC(2023, 1, 10));

      // A date exactly at the period end is exclusive, so it rolls into the next period.
      const boundary = new Date(Date.UTC(2023, 1, 10));
      const result = periodContaining(anchor, 1, boundary);
      expect(result.start.getTime()).toBe(Date.UTC(2023, 1, 10));
      expect(result.end.getTime()).toBe(Date.UTC(2023, 2, 10));
    });
  });

  describe('exactly one definition of each helper exists', () => {
    const forbiddenTokens = [
      'private startOfUtcDay',
      'private addMonths',
      'private periodContaining',
    ];

    const source = (relativePath: string): string =>
      readFileSync(join(__dirname, '..', '..', '..', 'src', relativePath), 'utf8');

    const leaveService = source(join('modules', 'leave', 'leave.service.ts'));
    const balanceService = source(join('modules', 'balance', 'balance.service.ts'));

    it('leave.service.ts contains no private copies of the shared date helpers', () => {
      for (const token of forbiddenTokens) {
        expect(leaveService).not.toContain(token);
      }
    });

    it('balance.service.ts contains no private copies of the shared date helpers', () => {
      for (const token of forbiddenTokens) {
        expect(balanceService).not.toContain(token);
      }
    });
  });
});
