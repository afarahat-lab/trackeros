/**
 * Module-internal connectivity probe. It owns no entity and persists nothing, so it
 * is not a domain repository — but per GP-001 the connectivity query still sits
 * behind an interface, and this is the seam the service injects. It is deliberately
 * NOT promoted to src/shared/db/ and is not a `ping()` on a domain repository.
 *
 * `check()` takes no optional trailing `PoolClient` (a deliberate divergence from the
 * other repositories in this codebase): a probe that joined a caller's transaction
 * would test that transaction rather than the pool.
 */
export interface IReadinessRepository {
  /** Resolves only on a successful round trip; rejects with the underlying pg error otherwise. */
  check(): Promise<void>;
}
