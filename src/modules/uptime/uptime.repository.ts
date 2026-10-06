import { Pool } from 'pg';
import { pool as defaultPool } from '../../shared/db';
import { IReadinessRepository } from './uptime.repository.interface';

/**
 * Bound owned by the readiness check itself — not the pool's connectionTimeoutMillis
 * and not the caller's deadline. A hung pool must produce NOT_READY within this
 * window rather than hanging the probe.
 */
const READINESS_QUERY_TIMEOUT_MS = 2000;

/** The connectivity predicate: a trivial round trip. Nothing else is checked. */
const READINESS_QUERY = 'SELECT 1';

/**
 * The only place the connectivity query is written. Stateless: every `check()` is a
 * fresh round trip against the shared pool — no caching, no memoization, no result
 * held between calls.
 */
export class PgReadinessRepository implements IReadinessRepository {
  constructor(private readonly dbPool: Pool = defaultPool) {}

  async check(): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Readiness query timed out after ${READINESS_QUERY_TIMEOUT_MS}ms`)),
        READINESS_QUERY_TIMEOUT_MS
      );
    });

    try {
      // Acquiring a client is not sufficient — the query must return.
      await Promise.race([this.dbPool.query(READINESS_QUERY), timeout]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }
}
