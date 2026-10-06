# PLAN.md

## Phase 1: Readiness probe + UptimeService.checkReadiness

Extend the EXISTING uptime module in place — do NOT create a new module, do NOT create a shared health abstraction, and do NOT touch src/modules/status/ (pre-existing, unreconciled, out of scope). Approximately 6 files, all under src/modules/uptime/.

READ FIRST (existing files this phase extends): src/modules/uptime/uptime.model.ts, src/modules/uptime/uptime.service.interface.ts, src/modules/uptime/uptime.service.ts, src/modules/uptime/index.ts, src/shared/db/index.ts (public entry point re-exporting `pool`, IUnitOfWork, PgUnitOfWork), src/shared/db/connection.ts (the single pg Pool — consume it, never open a second pool).

1. src/modules/uptime/uptime.model.ts — ADD (keep the existing UptimeStatus interface unchanged): `ReadinessState` enum with exactly two members, `READY = 'ready'` and `NOT_READY = 'not-ready'` (lowercase hyphenated string literals — the member value IS the wire value; no third member such as DEGRADED/UNKNOWN); `ReadinessStatus` = `{ status: ReadinessState }` — the sole field, the complete and only payload of GET /ready; and `ReadinessProbe` with the exact canonical field shape `id: string`, `startedAt: Date`, `completedAt: Date | null`, `outcome: ReadinessState | null`, `failureReason: unknown | null` (domain-internal only, never serialized into the HTTP body). These are module-local to src/modules/uptime/ — do NOT promote ReadinessStatus to src/shared/types/ (single-module use).

2. src/modules/uptime/uptime.repository.interface.ts — NEW. Declare the module-local probe interface `IReadinessRepository` with exactly one method `check(): Promise<void>` (resolves on a successful round trip, rejects otherwise). This is the GP-001-approved module-internal probe interface: it is NOT a domain repository (it owns no entity) and must NOT be promoted to src/shared/db/ or added as `ping()` on any domain repository.

3. src/modules/uptime/uptime.repository.ts — NEW. `PgReadinessRepository implements IReadinessRepository`. This is the ONLY place the connectivity query is written: `SELECT 1` executed against the shared pool imported from src/shared/db (the existing pool — no new pool, no new dependency). BINDING: the query carries an explicit 2000ms timeout owned by the readiness check itself, declared as a module-level NAMED constant (e.g. `READINESS_QUERY_TIMEOUT_MS = 2000`), never inline and never relying on the pool's connectionTimeoutMillis or the caller's deadline. BINDING: a successful ROUND TRIP is required — acquiring a client is not sufficient; the query must return. On timeout the rejection is identical to a rejected query. BINDING: NO caching and NO memoization — every call performs the check.

4. src/modules/uptime/uptime.service.interface.ts — ADD `checkReadiness(): Promise<ReadinessStatus>` to the existing `IUptimeService` (keep `getUptime()` unchanged).

5. src/modules/uptime/uptime.service.ts — implement `checkReadiness()` on the existing `UptimeService` (keep `getUptime()` unchanged). The constructor takes a constructor-injected `IReadinessRepository` defaulting to `new PgReadinessRepository()`, so the service never touches the pool directly. `checkReadiness()` awaits `probe.check()`, maps resolution to `{ status: ReadinessState.READY }` and any rejection to `{ status: ReadinessState.NOT_READY }` — it must NOT throw and must NOT put the raw error in the returned value. BINDING: no caching/memoization — every call performs the check.

6. src/modules/uptime/index.ts — extend the public entry point to also re-export the model additions (ReadinessStatus, ReadinessState, ReadinessProbe), the probe interface (IReadinessRepository), the probe implementation (PgReadinessRepository), and keep the existing UptimeStatus/IUptimeService/UptimeService/uptimeRoutes exports.

Do NOT add the /ready route in this phase (Phase 2) and do NOT add tests in this phase (Phase 3). Success criterion: `npm run build` (tsc --noEmit) clean; the existing /uptime behaviour is unchanged.

## Phase 2: GET /ready route + public-path exemption

Add the HTTP surface for readiness. Approximately 2 files.

READ FIRST (files created in Phase 1 that this phase depends on — read them before generating any code that references their types): src/modules/uptime/uptime.model.ts (ReadinessStatus, ReadinessState, ReadinessProbe), src/modules/uptime/uptime.service.interface.ts (IUptimeService.checkReadiness()), src/modules/uptime/uptime.service.ts (UptimeService with the constructor-injected IReadinessRepository), src/modules/uptime/uptime.repository.interface.ts (IReadinessRepository). Also read the existing src/modules/uptime/uptime.routes.ts and src/shared/auth/index.ts before editing them.

1. src/modules/uptime/uptime.routes.ts — ADD a `GET /ready` handler to the existing `uptimeRoutes(fastify)` function, alongside the existing `GET /uptime` handler which must remain byte-for-byte unchanged (do NOT migrate, rename, or alter /uptime). The handler calls `uptimeService.checkReadiness()` and returns the FIXED body with no other fields and no error details: 200 with `{ status: 'ready' }` when the check resolves, 503 with `{ status: 'not-ready' }` when it does not. BINDING OBSERVABILITY: on a failed check, log the error through the existing Fastify request logger via `request.log.error(error)` exactly as the /uptime handler already does — no new logging mechanism, and the raw error must NEVER appear in the HTTP response body. Follow the existing handler's try/catch shape.

2. src/shared/auth/index.ts — ADD `'/ready'` to the existing `PUBLIC_PATHS` set (which currently holds `'/uptime'`, `'/health'`, `'/auth/login'`). BINDING: /ready IS exempt from authentication — a readiness probe is called by infrastructure that holds no credentials, and a 401 would be indistinguishable from not-ready to every caller that matters. This is the intended one-path addition to the shared set, not a widening; do not add any other path and do not change registerAuth's default-deny behaviour.

Do NOT add tests in this phase (Phase 3). Success criterion: `npm run build` clean; GET /ready is reachable without a bearer token and returns exactly 200 {status:'ready'} or 503 {status:'not-ready'}.

## Phase 3: UptimeService.checkReadiness unit tests

Add the Jest unit tests for the readiness service method. Approximately 1 file; no production source is modified — the Phase 1 and Phase 2 deliverables are treated as fixed contracts.

READ FIRST (files created in prior phases that this phase depends on — read them before generating any test code that references their types): src/modules/uptime/uptime.service.ts and src/modules/uptime/uptime.service.interface.ts (UptimeService, IUptimeService.checkReadiness()), src/modules/uptime/uptime.model.ts (ReadinessStatus, ReadinessState), src/modules/uptime/uptime.repository.interface.ts (IReadinessRepository with `check(): Promise<void>`). Also read an existing service test for style, e.g. tests/unit/modules/balance/balance.service.test.ts, and follow the repository's existing unit-test placement and style.

1. tests/unit/modules/uptime/uptime.service.test.ts — NEW. Construct `UptimeService` with an in-memory fake `IReadinessRepository` (a `jest.fn()` for `check()`), following the existing fake-repository pattern used by the other module service tests. Cover exactly the two required cases plus the existing behaviour:
   - the connectivity query RESOLVES → `checkReadiness()` returns `{ status: ReadinessState.READY }` (i.e. `{ status: 'ready' }`), and the fake's `check` was called exactly once;
   - the connectivity query REJECTS → `checkReadiness()` returns `{ status: ReadinessState.NOT_READY }` (i.e. `{ status: 'not-ready' }`) and does NOT throw, and the returned object carries no error detail (assert the body has exactly the single `status` key);
   - BINDING: no caching/memoization — assert a second call invokes `check()` again (call count 2), proving every request performs the check;
   - keep/extend coverage of the existing `getUptime()` behaviour so the unchanged endpoint stays pinned.

Do NOT modify src/modules/uptime/*.ts or src/shared/auth/index.ts in this phase. Success criterion: `npx jest --passWithNoTests --forceExit` green with the new suite included.
