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

## ADR-002 — Database migrations for leave management (Phase 1)

Date: 2026-06-10
Status: Accepted

Decision: Created Knex configuration and three migrations for the leave management domain.

### What was built

- `knexfile.ts` at project root — Knex configured with `pg` client, TypeScript migrations, reading `DATABASE_URL` from environment.
- `migrations/001_create_leave_policies.ts` — `leave_policies` table with UUID PK, check-constrained `leave_type` varchar (inline enum, no separate `leave_types` table), and standard policy fields.
- `migrations/002_create_leave_requests.ts` — `leave_requests` table with UUID PK, FK `leave_type_id → leave_policies.id`, check-constrained `status` varchar, and lifecycle tracking columns.
- `migrations/003_create_leave_balances.ts` — `leave_balances` table with UUID PK, FK `leave_type_id → leave_policies.id`, decimal columns for entitlement/used/accrued days, integer `year`, and unique constraint on `(employee_id, leave_type_id, year)`.

### Design decisions

- **No separate `leave_types` table**: The `leave_type` is stored as a check-constrained varchar directly on `leave_policies`. This simplifies the schema (one less join) while still enforcing valid values at the database level. The `leave_type_id` FKs on `leave_requests` and `leave_balances` reference `leave_policies.id`, meaning a leave request is always tied to a specific policy.
- **`leave_balances` uses `year` (integer) not `fiscal_year`**: Simpler naming; the unique constraint on `(employee_id, leave_type_id, year)` enforces one balance row per employee per leave type per year.
- **`leave_balances` tracks `accrued_days` separately from `entitlement_days`**: Supports accrual-based policies where entitlement grows over time vs. being granted upfront.
- **No `policy_id` FK on `leave_balances`**: The `leave_type_id` FK to `leave_policies` is sufficient to identify the governing policy; avoids redundant FKs.
- **All migrations include `down` functions** using `dropTableIfExists` for clean rollback.

### Divergence from original conceptual model

The original ARCHITECTURE.md conceptual model assumed a separate `leave_types` table and a `policy_id` FK on `leave_balances`. The implemented schema is simpler and equally valid — the check constraint on `leave_type` provides the same enumeration guarantee without an extra table.
