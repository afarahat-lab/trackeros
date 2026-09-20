# PLAN.md

## Phase 1: Phase 1 — Seed module + knex wiring + npm run seed

Create the idempotent demo seed dataset and wire it into knex + npm.

Files (approximately 4):
1. `seeds/seed.service.ts` — the seed service (module `seed`, path `seeds/`). It owns the demo dataset and idempotency logic. It MUST import the canonical enums/helpers from their declared modules: `LeaveTypeCode`, `LeaveStatus`, `EmployeeRole`, `requestedDays` from `src/shared/types`; `periodContaining` from `src/shared/date`; `LeavePolicyStatus` from `src/modules/policy/policy.model.ts` (module-local enum, import via `src/modules/policy` public entry point). It MUST import `bcrypt` and mint password hashes via `bcrypt.hashSync(plaintext, 10)` — the SAME call `AuthService` verifies with. Define `const DEMO_PASSWORD_LITERAL = 'demo-password';` with a one-line comment stating it is demo data (BINDING rule 1/4 — hardcode the literal, do NOT read from env). Demo credentials: `manager@example.com` and `employee@example.com`, both with the SHARED password `'demo-password'` (BINDING rule 3). Build the dataset: one manager (role MANAGER) and one employee (role EMPLOYEE, managerId -> manager) with the canonical `Employee` field shape (id, employeeNumber, firstName, lastName, email, role, managerId, department, hireDate, terminationDate, employmentStatus, passwordHash); the leave types (annual, sick) and their ACTIVE leave policies with the canonical `LeavePolicy` fields (annualEntitlementDays, accrualPeriodMonths, carryForwardDays, minNoticeDays, maxRequestDays, requiresManagerApproval, effectiveFrom, effectiveTo, status); one `leave_balances` row per employee per leave type for the CURRENT accrual period derived via `periodContaining` anchored on `hireDate` (never a hand-written date); and two or three `leave_requests` in different states (SUBMITTED, APPROVED, REJECTED) with `requestedDays` computed via the shared `requestedDays` helper. Balance-counter consistency: SUBMITTED request days appear in `pending_days`, APPROVED days in `used_days` (derived from the seeded requests, never hardcoded independently). Idempotency: detect an already-seeded row by composite key (employee, leave_type, start_date for requests; email/employee_number for employees; code for leave types; stable seed id for policies; employee+leave_type+period_start+period_end for balances) and skip rather than duplicate or delete.
2. `seeds/001_demo_data.js` — the knex seed entry that registers ts-node and delegates to the seed service.
3. `knexfile.js` — add a `seeds: { directory: './seeds' }` block to the `development` environment (and the shared `base` if appropriate) so `knex seed:run` finds the seed. Do NOT add seeds to `production`/`smoke_pg`/`test` — the seed is development data only and must never run as part of migrate.
4. `package.json` — add `"seed": "knex seed:run"` to the root `scripts` block.

This phase depends on existing files (read before generating): `src/shared/types/index.ts` (enums + `requestedDays`), `src/shared/date/accrual.ts` (via `src/shared/date` entry point), `src/modules/policy/policy.model.ts` (`LeavePolicyStatus`), `src/modules/employee/employee.model.ts` (`Employee` shape), `src/modules/leave-type/leave-type.model.ts` (`LeaveType` shape), `src/modules/leave/leave.model.ts` (`LeaveRequest` shape), `src/modules/balance/balance.model.ts` (`LeaveBalance` shape), and `knexfile.js`. Use the exact canonical field names from the architecture — do not rename, split, add, or omit fields. Keep the existing UTC date discipline (all dates via `startOfUtcDay`/`periodContaining`/`requestedDays`).

## Phase 2: Phase 2 — Dev runner + npm run dev

Create the concurrent dev-runner script and wire `npm run dev`.

Files (approximately 2):
1. `scripts/dev.js` — module `dev-runner` (path `scripts/dev.js`). Concurrent process orchestration: spawn the API (`npm run start`) and the web dev server (`npm run dev` in `web/`) together; forward both children's stdout/stderr to the parent terminal with a per-process prefix; forward exit codes — when either child exits, terminate the sibling and exit with the child's code; signal handling so Ctrl-C tears down both children. Use Node's `child_process.spawn` with `stdio` piped and a prefix per stream, and register `SIGINT`/`SIGTERM` handlers that kill both children before exiting.
2. `package.json` — add `"dev": "node scripts/dev.js"` to the root `scripts` block.

This phase depends on the existing root `package.json` scripts `start` (ts-node src/index.ts) and the `web/package.json` `dev` (vite) script — read both before generating so the spawned commands match exactly. No dependency on Phase 1.

## Phase 3: Phase 3 — web test script fix

Fix the web subproject's test script so it runs once and exits instead of entering watch mode.

Files (1):
1. `web/package.json` — change the `test` script from `"vitest"` to `"vitest run"`. This is the only change; do not migrate the web subproject to Jest (BINDING rule 2 — Vitest is accepted for the React/Vite frontend, Jest for the API). No other file changes.

This phase depends on the existing `web/package.json` (read it before editing). No dependency on Phases 1 or 2.

## Phase 4: Phase 4 — README documentation

Document the exact local run commands and demo credentials in the README.

Files (1):
1. `README.md` — add a section documenting the exact local commands in order: migrate (`npm run migrate`), seed (`npm run seed`), start the API (`npm run start`), start the web dev server (`npm run dev` in `web/`), and the combined `npm run dev` (root). Document the demo credentials exactly: `manager@example.com` and `employee@example.com`, both with the SHARED password `demo-password` (BINDING rule 3 — shared password, documented as the same literal the seed hardcodes). Every command documented MUST exist and work — do not document a command that is not wired (the seed/`npm run dev` scripts are added in Phases 1 and 2). Note that the seed is development data only and never runs as part of migrate.

This phase depends on the scripts added in Phases 1 (`npm run seed`) and 2 (`npm run dev`), and the existing `npm run migrate`/`npm run start` scripts — read `package.json` and the existing `README.md` before editing so the documented commands match exactly.
