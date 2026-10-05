/**
 * Canonical PORT-resolution contract.
 *
 * The HTTP port is supplied by exactly one source: the `PORT` environment
 * variable, snapshotted once at process bootstrap and resolved through a pure
 * function. These declarations are intentionally free of any `process.env`
 * read so the resolver is unit-testable without a server, a socket, or a
 * mutated environment.
 */

/** Which branch produced a resolved port. */
export type PortSource = 'ENV' | 'DEFAULT';

/** Whether `PORT` was observed at all when the snapshot was taken. */
export type PortPresence = 'ABSENT' | 'PRESENT';

/**
 * The immutable observation of `PORT` taken at process bootstrap.
 *
 * `rawValue` is the exact string as observed (`undefined` when the variable is
 * not present) and `presence` is derived from it. The snapshot is taken once
 * and never mutated.
 */
export interface PortEnvironmentInput {
  rawValue: string | undefined;
  presence: PortPresence;
  observedAt: Date;
}

/**
 * The effective HTTP port plus the provenance needed to diagnose it.
 *
 * `port` is always a positive integer in 1..65535 by construction. `rawValue`
 * is retained for diagnostics only and must never be logged verbatim — it can
 * be arbitrary non-numeric environment garbage (GP-004).
 */
export interface ResolvedHttpPort {
  port: number;
  source: PortSource;
  rawValue: string | undefined;
}

/** Resolves the raw `PORT` value to the effective HTTP port. */
export interface IPortResolver {
  resolvePort(rawPort: string | undefined): ResolvedHttpPort;
}
