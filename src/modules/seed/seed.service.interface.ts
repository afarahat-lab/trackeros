/**
 * Contract for the idempotent demo-data seeder.
 *
 * `seed()` must be safe to run repeatedly: it skips any row whose natural key
 * already exists rather than failing or inserting a duplicate. It never
 * deletes-and-reinserts, so a hand-edited demo database is preserved.
 */
export interface ISeedService {
  seed(): Promise<void>;
}
