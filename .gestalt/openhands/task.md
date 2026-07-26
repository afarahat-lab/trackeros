# Implement this phase: Phase 1: Database migrations for leave tables

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/6f64b552-c5b8-42bc-86fa-01fa08ab4abe/1`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the Knex configuration and database migrations for the leave management domain.

Files to create:
- `knexfile.ts` at project root — configure Knex to use the existing DATABASE_URL from `src/shared/db/connection.ts`. Use the pg client, TypeScript migrations, and point at a `migrations/` directory.
- `migrations/001_create_leave_policies.ts` — create the `leave_policies` table with columns: id (uuid PK), policy_name (varchar, not null), leave_type (varchar, not null, check constraint for 'annual','sick','emergency','unpaid','maternity','paternity'), entitlement_days (integer, not null), accrual_rate (decimal, nullable), max_accumulation (decimal, nullable), minimum_notice_days (integer, nullable), requires_manager_approval (boolean, not null, default true), is_active (boolean, not null, default true), created_at (timestamptz, not null), updated_at (timestamptz, not null).
- `migrations/002_create_leave_requests.ts` — create the `leave_requests` table with columns: id (uuid PK), employee_id (uuid, not null), leave_type_id (uuid, not null, FK to leave_policies), start_date (date, not null), end_date (date, not null), reason (text, nullable), status (varchar, not null, default 'DRAFT', check constraint for 'DRAFT','SUBMITTED','APPROVED','REJECTED','CANCELLED'), approved_by (uuid, nullable), approved_at (timestamptz, nullable), rejected_by (uuid, nullable), rejected_at (timestamptz, nullable), rejection_reason (text, nullable), cancelled_by (uuid, nullable), cancelled_at (timestamptz, nullable), created_at (timestamptz, not null), updated_at (timestamptz, not null).
- `migrations/003_create_leave_balances.ts` — create the `leave_balances` table with columns: id (uuid PK), employee_id (uuid, not null), leave_type_id (uuid, not null, FK to leave_policies), entitlement_days (decimal, not null), used_days (decimal, not null, default 0), accrued_days (decimal, not null, default 0), year (integer, not null), created_at (timestamptz, not null), updated_at (timestamptz, not null). Add unique constraint on (employee_id, leave_type_id, year).

All migrations must have both `up` and `down` functions. Use `knex.schema.createTable` / `dropTableIfExists`. Use `knex.fn.uuid()` for UUID PK defaults.

## Project stack
Before writing code, read `HARNESS.json` in the working directory to learn the project's language, framework, and test runner, and follow the existing conventions in the repository. Read `docs/ARCHITECTURE.md` and `PLAN.md` if present.

## Verify before you finish (MANDATORY)
The code you write MUST compile and its tests MUST pass — a compilation or type error must NEVER be left for CI to find. Before you declare this task done:
- Read the project's build / type-check / test commands from `package.json` (scripts) and `HARNESS.json`.
- Install dependencies if they are not already installed, then RUN the type-check / build (e.g. `npm run build` or `tsc --noEmit`) AND the tests (e.g. `npm test`) for the files this phase touches.
- FIX every compilation error, type error, and failing test you introduced — including in test files — and re-run until they pass.
- Only when the build and the tests pass may you consider the task complete. If a dependency install genuinely cannot be made to work, say so explicitly in your final message rather than declaring success on unverified code.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations. (Running the build / type-check / tests above is expected and encouraged — that is NOT a git operation.)
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.