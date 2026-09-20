# PLAN.md

## Phase 1: Phase 1 — Seed service module

Create the seed service module under `src/modules/seed/` (the exact directory the architecture's Module Boundaries declare for the `seed` module). This phase builds ONLY the service layer — the knex seed entry, knexfile wiring, and npm script belong to Phase 2 and are intentionally absent.

Files to create (approximately 3):
- `src/modules/seed/seed.service.interface.ts` — declare `ISeedService` with a single method `seed(): Promise<void>` (idempotent demo-data seeding).
- `src/modules/seed/seed.service.ts` — implement `SeedService` (constructor-injected knex instance or `Knex` client). It must be IDEMPOTENT: before inserting each row, look up the natural key and skip if present; never delete-and-reinsert; never use magic id strings (ids are generated UUIDs via `randomUUID()`).
- `src/modules/seed/index.ts` — public entry point re-exporting `ISeedService` and `SeedService`.

The service must seed, in dependency order, using the canonical entity field shapes from the architecture (do NOT rename/split/add/omit fields):
1. Two employees — one MANAGER and one EMPLOYEE whose `managerId` links the employee to the manager. Both get `passwordHash` minted via the SAME `bcrypt.hashSync(plaintext, 10)` call the auth service verifies with (plaintext read from `process.env.SEED_PASSWORD` with a documented default — no hardcoded credential string, per no-hardcoded-secrets). Employee fields: id (randomUUID), employeeNumber, firstName, lastName, email, role (EmployeeRole), managerId, department, hireDate (UTC calendar date), terminationDate (null), employmentStatus (EmploymentStatus.ACTIVE), passwordHash.
2. Leave types — at minimum `annual` plus any others referenced by seeded policies, using LeaveType fields (code: LeaveTypeCode, name, requiresApproval, maxConsecutiveDays, isPaid).
3. Leave policies — LeavePolicy fields (id, leaveTypeCode, policyName, annualEntitlementDays, accrualPeriodMonths, carryForwardDays, minNoticeDays, maxRequestDays, requiresManagerApproval, effectiveFrom, effectiveTo, status: LeavePolicyStatus.ACTIVE).
4. A current-period leave balance for BOTH the manager and the employee (binding decision #2), using LeaveBalance fields (id, employeeId, leaveTypeCode, periodStart, periodEnd, entitledDays, usedDays, pendingDays). Derive the current accrual period with `periodContaining` from `src/shared/date` anchored on each employee's hireDate — never a hand-written date.
5. Two or three leave requests in different states (e.g. SUBMITTED, APPROVED, and optionally DRAFT/REJECTED), using LeaveRequest fields (id, employeeId, leaveTypeCode, startDate, endDate, requestedDays, reason, status: LeaveStatus, approverId, approvalComment, submittedAt, decidedAt, cancelledBy, cancelledAt). Compute `requestedDays` via the shared `requestedDays(startDate, endDate)` helper from `src/shared/types`.

Binding rule #3 (consistency): keep the balances CONSISTENT with the seeded requests — replicate the reservation arithmetic so SUBMITTED days appear in `pendingDays` and APPROVED days in `usedDays` on the owning employee's balance. Binding rule #1 (idempotency key for requests): detect an already-seeded leave request by the DETERMINISTIC COMPOSITE KEY `(employee_id, leave_type_code, start_date)` — look it up before inserting and skip if present.

This phase depends on existing files (read before generating): `src/shared/types/index.ts` (enums + `requestedDays`), `src/shared/date/index.ts` (`periodContaining`), `src/modules/employee/employee.model.ts` (Employee field shape), `src/modules/leave-type/leave-type.model.ts`, `src/modules/policy/policy.model.ts`, `src/modules/balance/balance.model.ts`, `src/modules/leave/leave.model.ts` (LeaveRequest field shape), and `migrations/20260913000000_initial_schema.js` (column names). Import every type from the EXACT module path the architecture declares for it.

Include Jest unit tests under `tests/unit/modules/seed/` covering idempotency (running twice inserts no duplicates) and balance/request consistency, using an in-memory or fake knex.

## Phase 2: Phase 2 — Knex seed entry + knexfile wiring + seed script

Wire the seed service into the knex seed mechanism and expose an `npm run seed` script. This phase builds ONLY the seed entry + knexfile wiring + npm script — no new service logic (the `SeedService` from Phase 1 is treated as a fixed contract).

Files to create/modify (approximately 3):
- `seeds/development_seed.js` (NEW) — a knex seed file that instantiates `SeedService` from `src/modules/seed` (via `require('ts-node/register')` then `require('../src/modules/seed')`) and calls `seed()`. It must target the DEVELOPMENT environment only and must NOT run automatically as part of `migrate` (knex seeds are a separate `knex seed:run` step, which satisfies this constraint). Export `up`/`down` (down may be a no-op or a documented destructive reset — prefer no-op to avoid destroying hand-edited demo data).
- `knexfile.js` (MODIFY) — add a `seeds: { directory: './seeds' }` block to the `development` environment (and only development; do NOT wire seeds into `production`, `test`, or `smoke_pg`). Keep the existing `migrations` config intact.
- `package.json` (MODIFY) — add `"seed": "knex seed:run --env development"` to the `scripts` block. Do not alter existing scripts.

This phase depends on `src/modules/seed/index.ts` and `src/modules/seed/seed.service.ts` from Phase 1 — read them before generating the seed entry so the exported symbol names (`ISeedService`, `SeedService`) and the `seed()` method signature are used exactly. Also read `knexfile.js` and `package.json` before editing.

No new unit tests are required for this phase (the seed entry is exercised by the Phase 3 docs/verification and the existing smoke flow); if you add any, keep them minimal.

## Phase 3: Phase 3 — Dev tooling + docs

Deliver the dev tooling and documentation that make the application runnable end to end. This phase builds ONLY the root dev script, the web test-script fix, and the README section — no seed/service logic changes.

Files to create/modify (approximately 3):
- `scripts/dev.js` (NEW) — a small Node script that spawns BOTH the API (`npm run start` / `ts-node src/index.ts`) and the web dev server (`npm --prefix web run dev`) as child processes, forwards their stdout/stderr, and forwards their exit codes (binding decision #4). Use only Node built-ins (`child_process.spawn`) — NO new devDependency. Follow the established `scripts/smoke.js` pattern (plain node script, no dependency).
- `web/package.json` (MODIFY) — change the `test` script from `"vitest"` to `"vitest run"` so it terminates instead of entering watch mode (a CI job invoking it today would hang until timeout). Do not alter any other script.
- `README.md` (MODIFY) — add a "Running locally" section documenting the exact commands in order: `npm run migrate`, `npm run seed`, `npm run dev` (or the API + web dev server separately), and the demo credentials to log in with (the seeded manager and employee emails + the `SEED_PASSWORD` default). Note that the seed is development-only and never runs as part of migrate.

This phase depends on `seeds/development_seed.js`, `knexfile.js`, and `package.json` from Phase 2 (for the `seed`/`migrate`/`start` script names and the seed entry), and `web/package.json` (for the test-script fix). Read `package.json` and `web/package.json` before editing so the documented commands match the actual script names.

No unit tests are required for this phase; the dev script and test-script fix are verified by the existing build/CI gate.
