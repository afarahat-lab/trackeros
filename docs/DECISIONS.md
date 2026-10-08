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

## ADR-002 — `notifications.related_entity_code` and the entity-correlation index

Date: 2026-09-15
Status: Accepted

Decision: `notifications` gains a nullable, generic `related_entity_code` text column and the
`(related_entity_type, related_entity_id)` index, both in ONE new migration
(`migrations/20260915000000_add_related_entity_code_to_notifications.js`). The column is
nullable, has no default, and is not backfilled.

Context: the cancellation-notification feature needs the approver to see the leave type without
a second lookup, and the entity-correlation index was already documented in
`docs/ARCHITECTURE.md` but was absent from the initial migration (which creates only
`(recipient_id, status)`).

Alternatives rejected:
- Editing `20260913000000_initial_schema.js` to add the index: an applied migration is not
  rewritten; the documented-vs-built drift is fixed forward, in a new migration.
- A leave-specific column, or a new table: the column is generic — a code for whatever
  `related_entity_type` names — so `notifications` stays one concept.
- A NOT NULL column with a backfill: notifications unrelated to a coded entity, and every row
  written before this migration, legitimately carry no code.
- Adding `leave_requests` `status` / `approver_id` indexes in the same migration: the existing
  `(employee_id, status)` index already serves the pending-decisions predicate, and
  `approver_id` needs no index for that query.

Consequences: `related_entity_code` is nullable and deliberately unindexed; the repository and
service never synthesize a non-null value. The column is not yet plumbed through the
notification model/repository — that is a later phase of the same feature.
