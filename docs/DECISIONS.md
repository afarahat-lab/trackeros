# Architecture Decisions — trackeros

## ADR-001 — Project initialised

Date: 2026-06-10
Status: Accepted

Decision: Project initialised via the Gestalt platform.
Description: Trackeros — a corporate operations web and mobile platform for
  mid-sized companies. Provides employee self-service (leave
  requests, balances, expense claims), manager workflows
  (approvals, team views, time-off calendars), and HR admin
  surfaces (leave policy configuration, balance accruals,
  audit reports).
  
  Backend: TypeScript on Node 20 (Fastify), PostgreSQL via
  Knex migrations + a thin repository layer, BullMQ for
  background jobs (accrual schedulers, notification fanout).
  Module structure: src/modules/<name>/<name>.{model,
  repository,service,controller,routes}.ts. Domain modules
  include leave, balance, employee, policy, notification.
  Shared utilities under src/shared/ (db connection, base
  repository, error types).
  
  Frontend: React + Vite SPA for the web client, React Native
  for the mobile client (shared @trackeros/contracts package
  for the typed REST surface). Auth via JWT against the
  backend's /auth endpoints; identity comes from corporate
  OIDC in production and from local users in development.
  
  Tests: Vitest for unit + integration. CI on GitHub Actions
  runs lint (ESLint) + typecheck (tsc --noEmit) + unit tests +
  a Semgrep security pass on every PR. Conventional Commits +
  squash-merge. Strict TypeScript (no implicit any, strict
  null checks).
Stack: TypeScript / Node.js / React / PostgreSQL
Architecture: Modular monolith (corporate-ops-web-mobile template, tier 1)

## ADR-002 — Balance row locking for read-then-write, and create atomicity

Date: 2026-09-14
Status: Accepted

Decision: A service that reads a row inside a transaction and then writes it must take a
row-level lock on the read (`SELECT ... FOR UPDATE`), and a state change plus its audit record
must share one unit of work.

Context: The leave-balance counters (`pendingDays`, `usedDays`) are computed in application
code — read the row, adjust, write the result. PostgreSQL's default READ COMMITTED isolation
permits two concurrent transactions to read the same value and compute the same delta, so the
second write silently discards the first; being inside a transaction is not sufficient.
Separately, `LeaveService.create` wrote its DRAFT row and its CREATE audit entry outside any
transaction, so a failing audit insert left a persisted request with no audit trail (GP-002).

Consequences:
- `IBalanceRepository.findByKey` / `findById` take an optional `forUpdate` flag; the lock clause
  is emitted only when an explicit `PoolClient` is supplied (a lock taken outside a transaction
  is released immediately and buys nothing). `LeaveService.submit` / `approve` / `reject` /
  `cancel` pass `forUpdate = true` before writing the balance; `create`'s validation-only read
  passes `false`.
- `LeaveService.create` now runs the insert and its audit record inside one
  `uow.withTransaction`, with the client forwarded to both.
- `LeaveService.approve` / `reject` assert `pendingDays >= requestedDays` before decrementing
  (`ConflictError` otherwise), so a lost update cannot drive the counter negative.

Note: the same phase landed the schema/repository groundwork for the GP-008 reversal feature —
the nullable `reverses_request_id` self-FK column plus its partial unique index, the
`reversesRequestId` model field, `ILeaveRepository.findByReversesRequestId`, and
`AuditAction.REVERSE` — but the APPROVED reversal branch in `LeaveService.cancel` is NOT
implemented: `cancel` still mutates the request in place for every status (DRAFT, SUBMITTED and
APPROVED alike), so an approved request is still mutated rather than reversed.
