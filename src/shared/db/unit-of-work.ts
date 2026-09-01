import type { PoolClient } from 'pg';

/**
 * A data-access unit-of-work abstraction. The service owns the transaction
 * boundary (what goes inside it), while the data-access layer acquires the
 * connection. This is the only abstraction through which a transaction is
 * opened.
 */
export interface IUnitOfWork {
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  /** A client acquired from the shared pool, available to participating repositories. */
  client?: PoolClient;
}
