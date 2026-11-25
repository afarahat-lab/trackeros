# Architecture history — feature dfc85052-311e-4b5d-b9d5-a4e1ec28165e

Extracted VERBATIM from `docs/ARCHITECTURE.md` on 2026-11-25 (owner's decision), where
planning had appended it as a per-feature block. The consolidation that followed merged
the repeated sections of all fourteen such blocks into one canonical section per
heading; this file is the unmerged original for THIS feature, including any question
later answered and any decision later superseded.

Nothing below is edited. Source lines 1337-1473 of the pre-consolidation
file, 26,148 bytes.

---

<!-- gestalt:architecture feature=dfc85052-311e-4b5d-b9d5-a4e1ec28165e START -->
## Readiness endpoint with a database connectivity check (`GET /ready`)

**Status:** reconciled across the domain, data, and application slices.
**Module:** `src/modules/uptime/` (extended — no new module, no shared health abstraction).
**Stack compliance:** TypeScript / Node 20 / npm / Jest / Fastify / PostgreSQL / modular monolith. No new dependency, no ORM, no second pool, no new framework. Compliant.

### 1. Domain entities
| Entity | Kind | Attributes | Lifecycle states |
|---|---|---|---|
| `ReadinessStatus` | value object | `status: ReadinessState` — the sole field; the wire body is exactly `{status:'ready'}` or `{status:'not-ready'}` | carries `ReadinessState` |
| `ReadinessState` | enum | `READY = 'ready'`, `NOT_READY = 'not-ready'` | `READY`, `NOT_READY` |
| `ReadinessResult` | discriminated result (internal, not a wire type) | `{ ok: true }` \| `{ ok: false; error: unknown }` — the service's return value | none (not a lifecycle entity) |
| `ReadinessProbe` | transient, per-request | `id`, `startedAt`, `completedAt`, `outcome`, `failureReason` | `PENDING`, `SUCCEEDED`, `FAILED` |

**Lifecycle states introduced by this feature (all reflected here):**

- `ReadinessState.READY` — the connectivity probe resolved. Terminal for the probe; maps to HTTP 200 `{status:'ready'}`.
- `ReadinessState.NOT_READY` — the connectivity probe rejected. Terminal for the probe; maps to HTTP 503 `{status:'not-ready'}`.
- `ReadinessProbe.PENDING` — the probe has been created and the connectivity query is in flight; `completedAt` and `outcome` are null.
- `ReadinessProbe.SUCCEEDED` — the query resolved; `outcome = READY`, `completedAt` stamped.
- `ReadinessProbe.FAILED` — the query rejected; `outcome = NOT_READY`, `completedAt` stamped, `failureReason` populated (domain-internal only).

Transitions, all named: `PENDING → SUCCEEDED` (probe resolves), `PENDING → FAILED` (probe rejects). Both are terminal; a probe is never re-entered, retried, cached, or reused. `SUCCEEDED`/`FAILED` are the only states that produce a `ReadinessStatus`.

`ReadinessResult` is not a lifecycle entity: it is the internal, per-call outcome the service hands the route, discriminated on `ok`. It is declared in `uptime.model.ts` alongside the other uptime types, re-exported from the module barrel, and never promoted to `src/shared/types/`. Its `error` field is typed `unknown` (no `any`) and is never serialized — the route passes it to `request.log.error` and replies with `ReadinessStatus`.
### 2. Business rules (binding)

1. The readiness predicate is exactly one thing: a trivial connectivity query against the configured PostgreSQL pool succeeds. Nothing else is checked — not disk, not memory, not downstream services, not migrations, not schema version. DECIDED, not open.
2. The probe is binary and total: resolves → `READY`; rejects → `NOT_READY`. No third outcome, no partial readiness, no degraded state. Any rejection (connection refused, auth failure, timeout, pool exhaustion) maps to `NOT_READY` without discrimination.
3. The probe is stateless and per-request: it opens no new pool, adds no dependency, caches no result, and holds no state between requests. It uses the existing shared pool from `src/shared/db/connection.ts`.
3a. The probe is **bounded in time**: the connectivity query carries an explicit 2000ms timeout owned by the readiness check itself, declared as the module-level named constant `READINESS_QUERY_TIMEOUT_MS` in `uptime.repository.ts`. It does not rely on the pool's `connectionTimeoutMillis` or the caller's deadline — a hung pool must not hang the probe. On timeout the rejection is identical to a rejected query and maps to `NOT_READY`.
3b. A successful **round trip** is required: acquiring a client from the pool is not sufficient, the query must return. A pool that hands out a client to an unreachable database is exactly the state readiness exists to detect.
4. The response body is fixed and carries no diagnostic detail: `READY` → HTTP 200 with exactly `{status:'ready'}`; `NOT_READY` → HTTP 503 with exactly `{status:'not-ready'}`. No other fields, no error message, no code, no stack, no raw error. The failure reason never crosses the HTTP boundary.
5. On a failed probe the error is logged through the existing Fastify request logger (`request.log.error`), exactly as the existing `/uptime` route does. No new logging mechanism. The raw error is logged, never returned in the body.
6. Readiness is a pure observation and is NOT a state-changing operation: it writes no audit record (GP-002 does not apply), mutates no entity, and opens no transaction. It must not be routed through `IUnitOfWork`.
7. The readiness endpoint is unauthenticated: it is a probe consumed by orchestrators that hold no bearer token. It is added to the `PUBLIC_PATHS` set in `src/shared/auth/index.ts` alongside `/uptime` and `/health`. GP-005 (RBAC) does not apply — there is no actor and no protected resource.
8. Liveness and readiness are distinct and must not be conflated: `/uptime` reports process uptime and never touches the database; `/ready` reports database connectivity and never reports uptime. The existing `/uptime` endpoint is not migrated, changed, or made to depend on the pool.
9. The probe's connectivity query is trivial and read-only: it must not read or write any domain table, must not depend on any table existing, and must not be a domain repository call. It is a bare pool-level round trip (`SELECT 1`).

### 3. Persistence

**No tables.** This feature persists no state. `sqlSchemas` is intentionally empty and the code agent has no migration to generate. No `readiness_checks` / probe-history / audit table is introduced — GP-002 binds state-changing operations, and a probe changes no state (an audit row per probe would also make readiness depend on a writable DB and turn a health path into a write path). No existing table is altered or redefined here; `employees`, `leave_requests`, `leave_balances`, `leave_policies`, `leave_types`, `audit_logs`, `notifications` remain defined once, in the earlier features' specs.

### 4. Repository

| Interface | Concrete | Method | Backing |
|---|---|---|---|
| `IReadinessRepository` | `PgReadinessRepository` | `check(): Promise<void>` — issues the trivial connectivity query (`SELECT 1`) against the shared pool; resolves when the round trip succeeds, rejects with the underlying pg error otherwise. No retry, no error swallowing, no logging (the route owns `request.log.error`). | PostgreSQL via the existing shared `pg` Pool exported from `src/shared/db/connection.ts` (constructor-injected `dbPool: Pool = defaultPool`), exactly as `PgLeaveRequestRepository` / `PgLeaveBalanceRepository` do. No new pool, no new dependency, no ORM. |

Declared in `src/modules/uptime/uptime.repository.interface.ts`, implemented in `src/modules/uptime/uptime.repository.ts`, both re-exported from `src/modules/uptime/index.ts`.

**Deliberate divergence (flagged, not silently taken):** `check()` takes NO optional trailing `PoolClient`, unlike every other repository in this codebase. The optional-client convention exists so a write can join a caller's transaction; a connectivity probe that joined a caller's transaction would test that transaction rather than the pool, and could report ready while the pool is exhausted. The probe must always acquire from the shared pool.

### 5. Module boundaries
- **Presentation** — `uptime.routes.ts`. `GET /ready` handler only: calls the service, reads the result's `ok` discriminator, maps it to 200/503 with a `ReadinessStatus` body, and logs the carried error via `request.log.error` on the failed check. No SQL, no business logic, no data access.
- **Application** — `UptimeService.checkReadiness()`. Owns the readiness predicate and the failure: probe resolves → `{ ok: true }`; probe rejects → `{ ok: false, error }` (the caught rejection, or the timeout `Error` when the 2000ms bound fired). It never throws and never logs — it hands the route something to log. Mapping the discriminator onto `ReadinessStatus` is the route's job.
- **Domain** — `ReadinessStatus` / `ReadinessState` / `ReadinessResult` in `uptime.model.ts`. Pure value types consumed by exactly one module, so per the placement rule they stay module-local and are NOT promoted to `src/shared/types/`.
- **Infrastructure** — `IReadinessRepository` / `PgReadinessRepository`. The only place the connectivity query is written; holds the shared pool from `src/shared/db`. Dependencies flow inward: routes → service → repository interface → shared-db.

`UptimeService` gains a **constructor-injected `IReadinessRepository` defaulting to `PgReadinessRepository`**, so the existing `new UptimeService()` call site in `uptime.routes.ts` keeps compiling and `/uptime` is untouched. This is also the seam the unit tests use.
### 6. Dependency map

- `uptime` -> `shared-db`
- `app` -> `uptime`
- `app` -> `shared-auth`
- `shared-auth` -> `shared-errors`

### 7. Cross-cutting contracts

**Auth / identity.** `request.user: { id: string; role: EmployeeRole }` where `EmployeeRole = 'EMPLOYEE' | 'MANAGER' | 'ADMIN'`, populated by the existing `registerAuth` preHandler in `src/shared/auth/index.ts` (JWT bearer verified via `jwt.verify`, `payload.sub` → id, `payload.role` → role). RBAC is enforced by route-level guards, never inline. **This feature's endpoint is the documented exception:** `GET /ready` is an unauthenticated infrastructure probe, so it is added to the `PUBLIC_PATHS` set alongside the existing `/uptime`, `/health`, and `/auth/login`, and carries no `resolveActor` call and no role guard. GP-005 is therefore not applied to `/ready` — the same exemption the existing `/uptime` liveness endpoint already relies on. No new role, no new token claim, no change to the identity shape.

**Error / response.** `GET /ready` uses a **fixed body with no error envelope**. Success: HTTP 200 `{ status: 'ready' }`. Not ready: HTTP 503 `{ status: 'not-ready' }` — 503 is the readiness signal, not an error response, and it carries no error detail, no message, and no code field. The raw probe error is never placed in the body; it is logged via `request.log.error(error)` exactly as `/uptime` does. An unexpected throw outside the probe path falls through to the app-level handler as HTTP 500 `{ error: 'Internal Server Error' }`, matching the existing `/uptime` behaviour. The standard `{ error, code }` envelope and the 400/401/403/404 cases do not apply: the endpoint takes no input (no validation failure), is unauthenticated (no 401/403), and addresses no resource (no 404).

**Transaction / unit of work.** None. Readiness is a single trivial read-only query with no writes, so no transaction is opened and `IUnitOfWork` is not involved. The repository's `check()` deliberately takes no optional `PoolClient` so the probe can never join a caller's transaction.

### 8. Recommended phases
1. **Phase 1 — Readiness probe + `UptimeService.checkReadiness`** (6 files). Adds `ReadinessStatus`/`ReadinessState` to `uptime.model.ts`; adds `checkReadiness()` to `IUptimeService`; adds `IReadinessRepository` (`check(): Promise<void>`) and `PgReadinessRepository`; `UptimeService` gains the constructor-injected repository defaulting to `PgReadinessRepository`; `index.ts` re-exports the new symbols. No HTTP surface, so it is unit-testable in isolation. DELIVERED — see section 11.
2. **Phase 2 — `GET /ready` route + public-path exemption** (planned as 2 files; delivered as 6). `uptime.routes.ts` gains the handler (200/503, `request.log.error` on failure, no error detail, `/uptime` byte-identical) and `src/shared/auth/index.ts` adds `'/ready'` to `PUBLIC_PATHS`. These must land together or the endpoint 401s. Depends on Phase 1 only. DELIVERED — the extra four files are the ones the new `ReadinessResult` type and the service-signature change force; see section 11.
3. **Phase 3 — `UptimeService.checkReadiness` unit tests** (1 file). `tests/unit/modules/uptime/uptime.service.test.ts`, in-memory fake implementing `IReadinessRepository`, no `jest.mock` of the pg driver. Two cases: probe resolves → `{ ok: true }`; probe rejects → `{ ok: false, error }` carrying the rejection, and does not throw. A third assertion pins that the probe was called exactly once. Depends on Phase 1; independent of Phase 2. DELIVERED — 9 cases, all against the post-Phase-2 service contract (`ReadinessResult`), not the original `ReadinessStatus` return; see section 11.
### 9. Reconciliation decisions

- **Canonical data-access name:** `IReadinessRepository` / `PgReadinessRepository` with `check(): Promise<void>` (the data slice's naming) supersedes the application slice's `IDatabaseProbe` / `PgDatabaseProbe` with `ping()`. Rationale: it keeps the connectivity query behind a repository interface per GP-001 and inside the established `uptime.repository.interface.ts` / `uptime.repository.ts` convention, which resolves the application slice's own GP-001 open question rather than carrying it forward. The deliberate divergence (no optional trailing `PoolClient`) is retained.
- **Canonical service method:** `checkReadiness()` on `IUptimeService` / `UptimeService` (application slice). No competing name existed.
- **`src/modules/status/`** is NOT used, extended, or reconciled. It is a second, unused health-shaped concept (`SystemStatus`, `StatusService.getStatus()`), unregistered in `src/app.ts`. Flagged as a dead-code decision, not a boundary to reconcile.
- **`docs/DOMAIN.md`** is stale relative to this document (it still records `LeaveRequest.leaveTypeId`, `approvedBy`/`approvedAt`, and `EmploymentStatus.INACTIVE`). The readiness entities above should be added under a `system`/`uptime` section rather than appended to the stale `system` block.

### 10. Open questions
1. **Probe time bound** — RESOLVED (Phase 1): the bound is the module-level named constant `READINESS_QUERY_TIMEOUT_MS` (2000ms) owned by `PgReadinessRepository.check()`, raced against the query so a hung pool rejects indistinguishably from a failed query.
2. **Round trip vs client acquisition** — RESOLVED (Phase 1): a successful round trip is required; acquiring a client from the pool is not sufficient.
3. **Caching / memoization** — the binding rule says no caching; a future TTL would introduce a staleness bound and a third probe concern. Still open as a future concern only — the delivered path caches nothing, and Phase 3 pins this with a test asserting a fresh `check()` on every call (two calls → probe called twice).
4. **`/ready` auth exemption** — RESOLVED (Phase 2): `'/ready'` is an exact string entry in the module-private `PUBLIC_PATHS` set in `src/shared/auth/index.ts`; the set is not exported or widened, and default-deny is unchanged for every other path. The consequence stands: database availability is publicly observable.
5. **`src/modules/status/` dead code** — remove, leave, or reconcile (reconciling would create the shared health abstraction the feature forbids). RESOLVED: left untouched, out of scope for this feature; unreconciled by decision, not by omission.
6. **Readiness-path request-log volume** — the app runs Fastify's request logging globally, so a probe polled on a short interval emits a log line per poll. No per-route logging configuration or sampling was added; the existing global behaviour is accepted. Open as an operational concern.
### 11. Delivery record
**Phase 1 — Readiness probe + `UptimeService.checkReadiness` (DELIVERED).** Six files, all under `src/modules/uptime/`; no new module, no shared health abstraction, `src/modules/status/` untouched. No test file added or modified; `uptime.routes.ts` and `src/shared/auth/index.ts` untouched.

- `uptime.model.ts` — `ReadinessState` (`READY='ready'`, `NOT_READY='not-ready'`, exactly two members), `ReadinessStatus` (`{ status }`), `ReadinessProbe` (`id`, `startedAt`, `completedAt`, `outcome`, `failureReason`) added alongside the unchanged `UptimeStatus`.
- `uptime.repository.interface.ts` — NEW. `IReadinessRepository` with the single method `check(): Promise<void>`; no optional trailing `PoolClient`.
- `uptime.repository.ts` — NEW. `PgReadinessRepository implements IReadinessRepository`, constructor-injected `dbPool: Pool = defaultPool` consumed through the shared `src/shared/db` entry point (`import { pool as defaultPool } from '../../shared/db'`). The only place `SELECT 1` is written. The 2000ms bound is the module-level named constant `READINESS_QUERY_TIMEOUT_MS`; the query is raced against that timer so the bound is owned by the check rather than inherited from the pool. A successful round trip is required; on timeout the rejection is identical to a rejected query. No caching, no memoization.
- `uptime.service.interface.ts` — `checkReadiness(): Promise<ReadinessStatus>` added to `IUptimeService`; `getUptime()` unchanged. (Return type superseded by Phase 2 below.)
- `uptime.service.ts` — `checkReadiness()` awaits `probe.check()`, maps resolution to `{ status: 'ready' }` and any rejection to `{ status: 'not-ready' }`; it never throws and never puts the raw error in the returned value. Constructor takes the injected `IReadinessRepository` defaulting to `new PgReadinessRepository()`, so the service never imports the pool. `getUptime()` unchanged. (Mapping superseded by Phase 2 below.)
- `index.ts` — re-exports the model additions, `IReadinessRepository`, `PgReadinessRepository`, and the pre-existing `UptimeStatus` / `IUptimeService` / `UptimeService` / `uptimeRoutes`.

**Divergences and resolutions recorded against the plan (code as built):**

- **Timeout enforcement mechanism** — the plan left the mechanism open (driver `query_timeout` vs a race in the repository). The implementation chose a `Promise.race` against a `setTimeout` in `PgReadinessRepository.check()`, with the timer cleared in a `finally`. The observable requirement (a hung query rejects indistinguishably from a failed query, constant module-level and named) is met.
- **`ReadinessProbe` is declared but never materialised** — `checkReadiness()` maps probe resolution/rejection straight to the result type; no `ReadinessProbe` object is constructed, and `failureReason` is therefore never populated. The type exists with the exact prescribed shape and never reaches the HTTP body. Its `PENDING`/`SUCCEEDED`/`FAILED` states remain derived from `completedAt`/`outcome` nullness, not from extra `ReadinessState` members.
- **`check()` takes no optional trailing `PoolClient`** — a deliberate, flagged divergence from every other repository in the codebase, documented in the repository interface's own doc comment and in section 4 above.

`GET /ready`, the `PUBLIC_PATHS` exemption, and the unit tests are Phases 2 and 3 and are not part of this delivery.

**Phase 2 — `GET /ready` route + public-path exemption (DELIVERED).** Six files touched: the two presentation/boundary files named in the plan (`uptime.routes.ts`, `src/shared/auth/index.ts`) plus the four the new result type and the service-signature change force (`uptime.model.ts`, `uptime.service.interface.ts`, `uptime.service.ts`, `index.ts`). `src/modules/status/` untouched and unreconciled (decision 5 above); `src/app.ts` unchanged — no new registration call, no prefix change.

- `uptime.model.ts` — `ReadinessResult = { ok: true } | { ok: false; error: unknown }` added alongside the existing model types. Module-local (per the placement rule), never promoted to `src/shared/types/`, never thrown, never logged by the service, and never serialized — the route reads only the `ok` discriminator and hands `error` to the request logger.
- `uptime.service.interface.ts` / `uptime.service.ts` — the one Phase 1 signature change this phase requires: `checkReadiness()` now returns `Promise<ReadinessResult>` instead of `Promise<ReadinessStatus>`. The service maps probe resolution to `{ ok: true }` and any rejection (including the 2000ms timeout rejection) to `{ ok: false, error }`; it still never throws, never logs, never caches, and still consumes the probe only through the injected `IReadinessRepository` (never the pool). `getUptime()` unchanged.
- `uptime.routes.ts` — `GET /ready` added to the existing `uptimeRoutes(fastify)` function, mirroring the liveness handler's shape (service constructed inside the `try`, caught error passed to `request.log.error`, `500 { error: 'Internal Server Error' }` fallback). `result.ok` → 200 `{ status: 'ready' }`; `!result.ok` → `request.log.error(result.error)` then 503 `{ status: 'not-ready' }`. The body is typed as the existing `ReadinessStatus`/`ReadinessState` (now imported into the route file); no error detail and no raw error ever reaches the body. The `/uptime` handler is byte-for-byte unchanged and `uptimeRoutes` keeps its signature.
- `index.ts` — `ReadinessResult` added to the model re-export; every pre-existing uptime symbol still re-exported under its own name.
- `src/shared/auth/index.ts` — `'/ready'` added as an exact string entry to the module-private `PUBLIC_PATHS` set. Matched the way the preHandler already matches (request URL with the query string stripped); the set is not exported, not widened to prefix/glob matching, no second exemption mechanism, and the default-deny branch is unchanged.

**Divergence from the plan's prescribed shape (resolved by clarification; code as built).** The plan had the service return the wire-body type and the route derive the body from it. The delivered service instead returns the internal discriminated `ReadinessResult`, so the service keeps ownership of the failure and the route keeps ownership of the logging: on `{ ok: false }` the route calls `request.log.error(result.error)` and replies 503 with the unchanged `{status:'not-ready'}` body. No new module, no change to `IReadinessRepository`, and no data access from the route. The HTTP contract is exactly as specified — the error is logged, never serialised.

**Verification.** `npm run build` (`tsc --noEmit`) clean; `npm test` 208/208 passing. Runtime check against a real Fastify instance with `registerAuth` + `uptimeRoutes` mounted: `GET /ready` with no bearer token → 503 `{"status":"not-ready"}` (probe unreachable) and 200 `{"status":"ready"}` (probe resolves) — never 401; `GET /uptime` → 200 `{"uptimeSeconds":0}`; a non-exempt path (`GET /leave`) still → 401 `{"error":"Missing bearer token"}`, confirming default-deny is intact.

**Phase 3 — `UptimeService.checkReadiness` unit tests (DELIVERED).** One file, `tests/unit/modules/uptime/uptime.service.test.ts` (136 lines, NEW). No production file touched — the module is treated as a fixed contract. The suite imports `IReadinessRepository`, `ReadinessResult`, `ReadinessState`, `ReadinessStatus`, and `UptimeService` from the module barrel (`../../../../src/modules/uptime`), so it exercises the public surface rather than internal paths.

- **Fake, not a mock of the driver.** `class FakeReadinessRepository implements IReadinessRepository { check = jest.fn<Promise<void>, []>(); }` — an in-memory fake whose `check` is a bare `jest.fn`. No `jest.mock` of `pg`, no pool, no database: whether `check()` resolves or rejects IS the database being reachable or not. The service is constructed as `new UptimeService(repository)` in `beforeEach`, using the Phase 1 constructor seam.
- **`getUptime()` (2 cases).** `jest.spyOn(process, 'uptime').mockReturnValue(123.7)` → `{ uptimeSeconds: 123 }`, pinning whole-second truncation via `Math.floor` and asserting `Object.keys(status)` is exactly `['uptimeSeconds']` (no extra field). A second case asserts the value is a non-negative integer without stubbing, so it holds for any real process uptime.
- **`checkReadiness()` (7 cases).** Resolve → `{ ok: true }` with `Object.keys(result)` exactly `['ok']` and `check` called once; reject → `{ ok: false, error: failure }` carrying the *same* rejection object, with `Object.keys(result).sort()` exactly `['error','ok']`, and no throw; a fresh check on every call (two calls → `check` called twice, no caching/memoization); a database that goes away between calls (`mockResolvedValueOnce` then `mockRejectedValueOnce` → ready then not-ready); and a bounded-timeout rejection (`new Error('Readiness query timed out after 2000ms')`) treated as not ready.
- **Wire-body pinning without touching production code.** A local `toReadinessBody(result: ReadinessResult): ReadinessStatus` helper mirrors the route's mapping (`result.ok ? READY : NOT_READY`) and is asserted to produce exactly `{ status: 'not-ready' }` / `{ status: 'ready' }` with `Object.keys(body)` exactly `['status']`. This pins the "no error detail on the wire" rule (section 2, rule 4) from the test side, since the route owns that mapping. The same cases assert `ReadinessState.READY === 'ready'` and `ReadinessState.NOT_READY === 'not-ready'`, pinning the enum's string values as the wire contract.

**Divergence from the plan's prescribed shape (code as built).** The plan specified three cases; the delivered suite has nine. The additions are all assertions of already-binding rules rather than new behaviour: whole-second truncation and the single-field `UptimeStatus` shape, the single-field `ReadinessStatus` body, the absence of caching, the transition from ready to not-ready across calls, and the timeout rejection mapping to `NOT_READY`. The plan's three required cases (resolve → `{ ok: true }`; reject → `{ ok: false, error }` carrying the rejection and not throwing; `check` called exactly once) are all present. The plan's "no `jest.mock` of the pg driver" constraint is honoured — the fake is hand-written and the driver is never imported.

**Verification.** `npm test` — the new suite passes; the full API suite is green. No production file changed, so `npm run build` (`tsc --noEmit`) is unaffected by this phase.

**All three phases of this feature are now delivered.** No phase of the readiness feature remains outstanding.

