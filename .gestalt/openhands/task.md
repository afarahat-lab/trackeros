# Implement this phase: Phase 5: Balance module — model and repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/35df38af-c9d7-41ee-b412-79ee8d149189/5`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the balance module at `src/modules/balance/`. This phase depends on:
- `src/shared/types/index.ts` from Phase 1
- `src/modules/employee/employee.model.ts` from Phase 2
- `src/modules/policy/policy.model.ts` from Phase 3

Read all three before generating any code.

Files to create:
- `src/modules/balance/balance.model.ts` — Define the **LeaveBalance** entity with EXACT fields: `id: string`, `employeeId: string`, `policyId: string`, `totalEntitlement: number`, `usedDays: number`, `remainingDays: number` (COMPUTED — see binding rule below), `fiscalYear: number`, `status: BalanceStatus` (define BalanceStatus as `'ACTIVE' | 'EXHAUSTED' | 'EXPIRED'`), `createdAt: Date`, `updatedAt: Date`.

  Also define **IBalanceRepository** interface with methods:
  - `findByEmployeeAndPolicy(employeeId: string, policyId: string, fiscalYear: number): Promise<LeaveBalance | null>`
  - `findByEmployeeId(employeeId: string, fiscalYear?: number): Promise<LeaveBalance[]>`
  - `create(data: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>`
  - `updateUsedDays(id: string, usedDays: number): Promise<LeaveBalance | null>` — atomic update
  - `incrementUsedDays(id: string, days: number): Promise<LeaveBalance | null>` — atomic increment, must fail if remainingDays (totalEntitlement - usedDays) would go below zero
  - `decrementUsedDays(id: string, days: number): Promise<LeaveBalance | null>` — atomic decrement for restore-on-reject/cancel

  **BINDING RULE**: `remainingDays` is COMPUTED/DERIVED, never stored. All consumers compute it as `totalEntitlement - usedDays`. The repository must NOT write remainingDays; it is computed at query time.

- `src/modules/balance/balance.repository.ts` — Implement **BalanceRepository** class implementing IBalanceRepository using the pg pool. The `incrementUsedDays` method must use an atomic SQL UPDATE with a CHECK/WHERE clause ensuring `totalEntitlement - usedDays - :days >= 0`, throwing a specific error if the balance would go negative. The `decrementUsedDays` method must ensure usedDays never goes below 0.
- `src/modules/balance/index.ts` — Barrel export.

Include Jest unit tests in `tests/unit/modules/balance/`.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decision (answers all 6 questions; apply consistently across annual, sick, and emergency leave):

1. Fiscal/leave year = CALENDAR YEAR (Jan 1 – Dec 31). Derive fiscalYear = the calendar year of the request start_date. Not tenant-configurable for now.

2 & 5. Day counting = BUSINESS DAYS ONLY, excluding weekends AND public holidays, applied uniformly to ALL leave types. Introduce a `holidays` table (public-holiday calendar) used by a single shared day-count function so every call site (balance sufficiency check, deduction, restoration) computes identically. Whole days only — no half-day or partial-day leave.

3. Employee with no manager (managerId is null): ESCALATE to the HR admin role for approval. Do NOT auto-approve and do NOT block submission.

4. leave_balances.used_days = DENORMALIZED COUNTER and the source of truth (balance reads are O(1)). Deduct-on-submission: increment used_days atomically, in the same transaction, when a LeaveRequest is SUBMITTED (reserving the balance so an employee cannot over-book). Restore-on-reject/cancel: decrement used_days when that request is REJECTED or CANCELLED. Approval does NOT change used_days again (it was already deducted at submission). A submission must fail if it would drive remaining below zero.

6. remainingDays = COMPUTED/DERIVED, never stored: remainingDays = totalEntitlement - usedDays, calculated at query time. All consumers use this one formula; no code path writes remainingDays directly. This eliminates drift. [BINDING RULE — operator decision resolving: How is the fiscal year boundary defined — calendar year (Jan 1 – Dec 31) or a company-specific fiscal year (e.g., Apr 1 – Mar 31)?; Should the day-count calculation for leave consumption exclude weekends and/or public holidays (business days only), or count all calendar days?; When an employee has no manager (managerId is null), who approves their SUBMITTED LeaveRequest? Does it auto-approve, escalate to a department head, or require a different workflow?; How is `used_days` in `leave_balances` derived — is it a denormalized counter incremented atomically on leave approval, or is it computed on-the-fly by summing the day counts of all approved `leave_requests` for that employee/type/year?; Are leave day counts based on calendar days (inclusive start-to-end) or working/business days (excluding weekends and holidays)?; Should Balance.remainingDays be a stored column or a computed (derived) field?; apply everywhere these apply, not in one place only]

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The BalanceRepository must follow the same standalone-class repository conventions as EmployeeRepository: import pool from ../../shared/db/connection; parameterized SQL ($1, $2); a private mapRow helper converting snake_case columns to camelCase entity fields with new Date(...) for date columns; create uses INSERT INTO ... RETURNING * omitting id/createdAt/updatedAt. No base repository class exists to extend. (see `src/modules/employee/employee.repository.ts`)
- Any dynamic-update path (e.g. updateUsedDays or a general update) must match the PolicyRepository/EmployeeRepository pattern: build SET clauses from a fieldMap with an incrementing paramIndex, append updated_at = NOW(), and fall back to findById when no fields are supplied. Nullable fields use data[key] ?? null. (see `src/modules/policy/policy.repository.ts`)
- The balance barrel index.ts must match the sibling-module pattern: re-export the entity interface and repository interface from the model file, and the concrete repository class from the repository file (e.g. export { LeaveBalance, IBalanceRepository } from './balance.model'; export { BalanceRepository } from './balance.repository'). (see `src/modules/employee/index.ts`)
- Unit tests must match the established pattern: jest.mock('shared/db/connection', () => ({ pool: { query: jest.fn() } })); path-alias imports (modules/balance/..., shared/db/connection); a makeRow(overrides) snake_case helper; beforeEach resets the mock and instantiates the repo; describe/it per method. Jest config moduleDirectories: ['node_modules', 'src'] enables the aliases. (see `tests/unit/modules/employee/employee.repository.test.ts`)
- BalanceStatus must be defined locally in the balance module because src/shared/types/index.ts contains no BalanceStatus type (confirmed by reading the file — it exports LeaveType, LeaveRequestStatus, LeaveStatus, EmploymentStatus, AuditAction, BaseEntity, and DTOs only). Do not import BalanceStatus from shared types. (see `src/shared/types/index.ts`)
- The reconciled.json LeaveBalance entity lists remainingDays as a stored column updated atomically, but the operator binding rule (business_rules item 6) and PLAN.md Phase 5 override this: remainingDays is computed at query time and never written. The implementation must follow the binding rule, not the schema doc, for remainingDays semantics. (see `.gestalt/architecture/reconciled.json`)
### Entity invariants — enforce these
- Reuse or extend `LeaveBalance`: remainingDays is a pure function of totalEntitlement and usedDays (remainingDays = totalEntitlement - usedDays) at every read; it is never an independently stored/mutable value. Any LeaveBalance returned by the repository must satisfy remainingDays === totalEntitlement - usedDays.
- Reuse or extend `LeaveBalance`: usedDays must never be negative. decrementUsedDays is guarded so used_days - days >= 0; no operation may produce a LeaveBalance with usedDays < 0.
- Reuse or extend `LeaveBalance`: usedDays must never exceed totalEntitlement (equivalently remainingDays >= 0). incrementUsedDays is guarded so totalEntitlement - usedDays - days >= 0; an attempt to over-deduct is rejected and leaves the row unchanged.
- Reuse or extend `LeaveBalance`: A LeaveBalance is uniquely identified by the composite (employeeId, policyId, fiscalYear); findByEmployeeAndPolicy resolves at most one balance for that triple, consistent with the unique composite index on (employee_id, policy_id, fiscal_year).
- Reuse or extend `LeaveBalance`: The status field is constrained to exactly the BalanceStatus union 'ACTIVE' | 'EXHAUSTED' | 'EXPIRED' (defined locally in the balance module); no other status value is representable on the entity.
### Interface contract — expose these operations (their shape is yours)
- IBalanceRepository.incrementUsedDays(id, days) — Atomic guarded UPDATE: must fail (throw a specific local Error subclass, not a generic Error, and not return null) when totalEntitlement - usedDays - days < 0, leaving the row unchanged. Returns the updated LeaveBalance on success, or null when the row does not exist. Never writes remaining_days.
- IBalanceRepository.decrementUsedDays(id, days) — Atomic guarded UPDATE: must not mutate the row when usedDays - days < 0 (guard failure) or the row is missing; returns null in both cases without throwing. Returns the updated LeaveBalance on success. Never writes remaining_days.
- IBalanceRepository.updateUsedDays(id, usedDays) — idempotent; Atomic direct SET of used_days with updated_at = NOW(); returns the updated LeaveBalance or null when the row is missing. Never writes remaining_days.
- IBalanceRepository.create(data) — INSERT ... RETURNING * omitting id/createdAt/updatedAt and omitting remaining_days; returns the persisted LeaveBalance with remainingDays computed. Relies on the unique composite index to reject duplicate (employeeId, policyId, fiscalYear) triples via a database constraint error.
- IBalanceRepository.findByEmployeeAndPolicy(employeeId, policyId, fiscalYear) — idempotent; Returns the single matching LeaveBalance (remainingDays computed) or null when none exists; resolves at most one row per the unique composite index.
- IBalanceRepository.findByEmployeeId(employeeId, fiscalYear?) — idempotent; Returns all LeaveBalance rows for the employee, optionally filtered by fiscalYear; each returned entity has remainingDays computed. Returns an empty array when none match.
### Integration points — connect to these
- src/shared/db/connection.ts (pg Pool export) — BalanceRepository imports the shared pool for all database access, matching every sibling repository; this is the single database access point (GP-001).
- src/shared/types/index.ts — The balance module depends on shared types (Phase 1) for cross-cutting enums/types; BalanceStatus itself is local because shared types has no such export.
- src/modules/employee (Employee entity / IEmployeeRepository) — LeaveBalance references employeeId; the balance module imports the Employee type reference from the employee module per the dependency map (balance → employee is implicit via the FK, and the leave service in Phase 9 will join them).
- src/modules/policy (LeavePolicy entity / IPolicyRepository) — LeaveBalance references policyId and totalEntitlement is derived from LeavePolicy.entitlementDays; the balance module imports the LeavePolicy type reference per the dependency map (balance → policy, shared-types).
- src/modules/leave/leave.service.ts (Phase 9, not yet built) — The leave service will consume incrementUsedDays (deduct-on-submission) and decrementUsedDays (restore-on-reject/cancel) as atomic primitives; this phase defines the contract those operations must satisfy so Phase 9 can rely on the guards.

## Project constraints (NON-NEGOTIABLE — the gate enforces these; satisfy them now)
Your code MUST obey every rule below. These are not style preferences — the quality gate rejects the phase on any violation, so comply up front:
- Use unknown with type guards instead of any (rule: `no-any`)
- Database calls must go through repository pattern (rule: `no-direct-db-outside-repository`)
- No hardcoded passwords, API keys, or tokens (rule: `no-hardcoded-secrets`)
- Do not add @gestalt/* packages as project dependencies — these are Gestalt platform internals not available on npm (rule: `no-gestalt-internal-deps`)

## Architecture & constraint rules the quality gate enforces (satisfy these now)
The quality gate judges your code against the rules below and BLOCKS the phase on any violation — a violation it rates critical escalates to a human with no automatic retry. These are the same rules the gate checks, so comply up front rather than leaving them for the gate:
- Data access is only permitted in the designated data access layer of this project. Code in business logic, presentation, or routing layers must delegate all data operations to the data access layer.
- The data access layer is the only layer permitted to contain connection management, query execution, and direct interaction with the data store.
- Each architectural layer communicates only with its immediately adjacent layer. Layers must not bypass intermediate layers.
- Dependencies flow in one direction only — from outer layers toward inner layers. Inner layers must not depend on outer layers.
- Error handling must be explicit. Callers must not be exposed to unhandled failures from dependencies.

## Project stack & references
Before writing code, read the referenced files below (those present in the working directory) to learn the project's language, framework, test runner, and conventions, and the cross-cutting rules your code must satisfy — then follow the existing repository conventions:
- `HARNESS.json`
- `docs/ARCHITECTURE.md`
- `docs/GOLDEN_PRINCIPLES.md`
- `AGENTS.md`
- `PLAN.md`

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