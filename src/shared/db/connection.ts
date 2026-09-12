import { Pool, types } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Parse `date` columns as UTC midnight, not local midnight.
 *
 * node-pg's default parser turns the DATE value `2020-01-01` into a JS Date at LOCAL
 * midnight. A SQL `date` carries no timezone, so that is an invention — and it collides
 * head-on with this codebase, whose accrual arithmetic is written entirely in UTC
 * (`startOfUtcDay`, `addMonths` via `getUTCDate`/`setUTCMonth`).
 *
 * On a UTC server the two agree and everything works. On any server east of Greenwich
 * they do not: at UTC+3, `2020-01-01` arrives as `2019-12-31T21:00:00Z`, `startOfUtcDay`
 * reads it as 2019-12-31, and every accrual period from the hire date onward is shifted a
 * day early — so `findByKey` looks up a period boundary that no balance row holds and the
 * request fails with "Leave balance not found". Silent, timezone-dependent, and invisible
 * to unit tests, which construct their own Dates and never cross the driver.
 *
 * Returning UTC midnight makes the driver agree with the arithmetic that consumes it.
 * Found by the smoke check's authenticated probe (see scripts/smoke.js).
 */
types.setTypeParser(types.builtins.DATE, (value: string) => new Date(`${value}T00:00:00Z`));

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: true, ca: process.env.DB_SSL_CA }
      : false
});
