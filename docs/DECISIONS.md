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

## ADR-002 — Soft delete for Employee records

Date: 2026-06-10
Status: Accepted

Decision: `EmployeeRepository.delete()` performs a **soft delete** — it sets
`deleted_at = NOW()` rather than issuing a hard `DELETE FROM employees`.

Rationale:
- The `Employee` model includes a `deletedAt: Date | null` field, which
  signals soft-delete semantics.
- Soft deletes preserve referential integrity for related records (leave
  requests, balances, audit logs) that reference the employee.
- All `find*` queries in `EmployeeRepository` filter out soft-deleted rows
  with `WHERE deleted_at IS NULL`, so deleted employees are invisible to
  normal application queries.
- If hard-delete semantics are ever needed, a separate `purge` method can
  be added without changing the existing contract.

Alternatives considered:
- Hard delete (`DELETE FROM employees WHERE id = $1`) — rejected because
  it would orphan related records and violate referential integrity.

## ADR-003 — Raw pg driver for repository layer (Knex deferred to migrations)

Date: 2026-06-10
Status: Accepted

Decision: The repository layer uses the raw `pg` driver (`Pool` from
`src/shared/db/connection.ts`) with parameterized SQL queries. Knex is
deferred to Phase 10 for database migrations only.

Rationale:
- `src/shared/db/connection.ts` already exports a raw `pg.Pool` instance,
  and the Phase 2 EmployeeRepository was implemented against it with
  parameterized queries (`$1`, `$2`, …).
- The intent specification explicitly directs repositories to use "the pg
  pool from `src/shared/db/connection.ts`", making the raw driver
  authoritative for the repository layer.
- Knex remains the planned tool for schema migrations (Phase 10), where
  its migration runner and seed support add value. The repository layer
  does not need Knex's query builder — parameterized SQL is sufficient
  and avoids an unnecessary abstraction.

Alternatives considered:
- Switch `connection.ts` to export a Knex instance and rewrite all
  repositories to use the Knex query builder — rejected because it would
  require refactoring the already-implemented EmployeeRepository and adds
  complexity without clear benefit at the repository layer.
- Use Knex for both migrations and repositories — rejected for the same
  reason; the raw pg driver is simpler and already in place.

Consequences:
- If Knex is later introduced as the primary query interface, all
  repositories will need refactoring. This is acceptable because the
  repository pattern isolates database access behind interfaces, making
  such a change contained.
