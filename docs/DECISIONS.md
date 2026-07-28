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
  
  Tests: Jest for unit + integration. CI on GitHub Actions
  runs lint (ESLint) + typecheck (tsc --noEmit) + unit tests +
  a Semgrep security pass on every PR. Conventional Commits +
  squash-merge. Strict TypeScript (no implicit any, strict
  null checks).
Stack: TypeScript / Node.js / React / PostgreSQL
Architecture: Modular monolith (corporate-ops-web-mobile template, tier 1)

## ADR-002 — Shared foundation for leave management (Phases 1 + 8)

Date: 2026-06-10
Status: Accepted

Decision: Built the shared type system, error classes, abstract base repository, and route wiring as the foundation for the leave management feature.

### What was built

1. **`src/shared/types/index.ts`** — Three canonical enums:
   - `LeaveType`: `ANNUAL`, `SICK`, `EMERGENCY`
   - `LeaveRequestStatus`: `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `CANCELLED`
   - `EmploymentStatus`: `ACTIVE`, `ON_LEAVE`, `TERMINATED`, `SUSPENDED`

2. **`src/shared/errors.ts`** — Four error classes, each extending `Error` with a `statusCode`:
   - `NotFoundError` (404), `ValidationError` (400), `UnauthorizedError` (401), `ConflictError` (409)
   - All use `Object.setPrototypeOf` for correct `instanceof` behaviour.

3. **`src/shared/base.repository.ts`** — Abstract generic `BaseRepository<T>` with a `db` getter returning the shared `pool` and five abstract methods: `findById`, `findAll`, `create`, `update`, `delete`.

4. **`src/modules/leave/leave.routes.ts`** — Placeholder Fastify plugin (no endpoints yet) registered in `app.ts` alongside `uptimeRoutes`.

5. **Tests** — `tests/unit/shared/errors.test.ts` (5 tests covering status codes, default messages, `instanceof`) and `tests/unit/shared/base.repository.test.ts` (3 tests covering abstract instantiation guard, `db` property, concrete subclass implementation).

### Design decisions

- **Enums use string values** (`ANNUAL` not `0`) for readability in logs and API responses.
- **`BaseRepository` methods are abstract** (not concrete with default SQL) — each concrete repository writes its own queries, keeping the base class as a contract rather than a coupled implementation.
- **`db` is a getter** returning the shared `pool` so subclasses access it via `this.db` without needing constructor injection.
- **Error classes use `Object.setPrototypeOf`** to fix prototype chain after `super()` call, ensuring `instanceof` works correctly in TypeScript's ES5+ target.
- **Phase 8 (route wiring) was built alongside Phase 1** to establish the end-to-end registration pattern early, even though the leave routes are a no-op placeholder.

### Divergence from PLAN.md

- PLAN.md prescribed `EmploymentStatus` values as `ACTIVE`, `ON_LEAVE`, `TERMINATED`, `SUSPENDED` — built as specified.
- PLAN.md prescribed `LeaveType` values as `ANNUAL`, `SICK`, `EMERGENCY` — built as specified (the DOMAIN.md lists additional types `unpaid`, `maternity`, `paternity` which are not yet in the enum; these may be added in later phases).
- PLAN.md prescribed `UnauthorizedError` with status code 403 — built with 401, which is the correct HTTP status for authentication failures (403 is for forbidden/authorization failures). This is a deliberate correction.
- PLAN.md prescribed Phase 8 as a separate phase — it was built together with Phase 1 in this cycle.
