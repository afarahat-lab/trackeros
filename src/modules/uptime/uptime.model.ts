export interface UptimeStatus {
  uptimeSeconds: number;
}

/**
 * The readiness response contract. Binary and total: the probe either completes a
 * round trip against the database or it does not, so there is no third member and
 * the member value IS the wire value.
 */
export enum ReadinessState {
  READY = 'ready',
  NOT_READY = 'not-ready',
}

/** The complete and only payload of GET /ready — no identity, no detail, no error. */
export interface ReadinessStatus {
  status: ReadinessState;
}

/**
 * Transient, per-request record of a single connectivity evaluation. Never
 * persisted, cached, or shared. PENDING is derived from `completedAt`/`outcome`
 * being null rather than from an extra ReadinessState member. `failureReason` is
 * domain-internal and never crosses the HTTP boundary.
 */
export interface ReadinessProbe {
  id: string;
  startedAt: Date;
  completedAt: Date | null;
  outcome: ReadinessState | null;
  failureReason: unknown | null;
}
