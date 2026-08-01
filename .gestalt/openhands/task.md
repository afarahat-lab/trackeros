# Implement this phase: Phase 3: Policy module — model and repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/35df38af-c9d7-41ee-b412-79ee8d149189/3`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the policy module at `src/modules/policy/`. This phase depends on `src/shared/types/index.ts` from Phase 1 — read it before generating any code that references LeaveType.

Files to create:
- `src/modules/policy/policy.model.ts` — Define the **LeavePolicy** entity with EXACT fields: `id: string`, `policyName: string`, `leaveType: LeaveType` (import from `src/shared/types`), `entitlementDays: number`, `accrualRate: number | null`, `maxAccumulation: number | null`, `minimumNoticeDays: number | null`, `requiresManagerApproval: boolean`, `isActive: boolean`, `createdAt: Date`, `updatedAt: Date`. Also define **IPolicyRepository** interface with methods: `findById(id: string): Promise<LeavePolicy | null>`, `findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy[]>`, `findActive(): Promise<LeavePolicy[]>`, `create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>`, `update(id: string, data: Partial<LeavePolicy>): Promise<LeavePolicy | null>`.
- `src/modules/policy/policy.repository.ts` — Implement **PolicyRepository** class implementing IPolicyRepository using the pg pool from `src/shared/db/connection.ts`. Use parameterized queries.
- `src/modules/policy/index.ts` — Barrel export of LeavePolicy, IPolicyRepository, PolicyRepository.

Include Jest unit tests in `tests/unit/modules/policy/` mocking the db pool.

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
- The PolicyRepository must mirror the EmployeeRepository structural pattern: a class implementing its interface via `pool.query` with parameterized SQL, a private `mapRow(row: Record<string, unknown>)` helper converting snake_case DB columns to camelCase entity fields (wrapping created_at/updated_at with `new Date(...)`), and a dynamic fieldMap-driven `update` that appends `updated_at = NOW()` and falls back to `findById` when no fields are supplied. (see `src/modules/employee/employee.repository.ts`)
- The policy model file must follow the same shape as the employee model: an entity interface with camelCase fields plus a repository interface declaring the five methods, with no class on the model side (the class lives in the repository file). (see `src/modules/employee/employee.model.ts`)
- The policy barrel must re-export the entity interface, the repository interface, and the repository class — matching the employee barrel's three-symbol export set. (see `src/modules/employee/index.ts`)
- The policy repository test must follow the employee test conventions: jest.mock('shared/db/connection', () => ({ pool: { query: jest.fn() } })), a makeRow(overrides) helper returning snake_case rows, mockQuery.mockReset() in beforeEach, mockResolvedValueOnce({ rows: [...] }), and assertions on both the returned mapped entity and the exact mockQuery call (SQL + params). (see `tests/unit/modules/employee/employee.repository.test.ts`)
- The LeavePolicy.leaveType field and the findByLeaveType parameter must use the LeaveType enum exported from shared/types (ANNUAL/SICK/EMERGENCY/UNPAID/MATERNITY/PATERNITY, lowercase string values) — not a locally redefined string type. (see `src/shared/types/index.ts`)
- The repository's SQL must target the `leave_policies` table with the reconciled column set (id, leave_type, policy_name, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active, created_at, updated_at); findActive filters is_active = true and findByLeaveType filters leave_type = $1, matching the documented unique index on leave_type and index on is_active. (see `.gestalt/architecture/reconciled.json`)
### Entity invariants — enforce these
- Reuse or extend `LeavePolicy`: Each LeavePolicy is bound to exactly one LeaveType (the `leave_type` column has a unique index), and its lifecycle is the ACTIVE/INACTIVE toggle expressed by the `isActive` boolean — there is no separate status enum.
- Reuse or extend `LeavePolicy`: The nullable numeric fields (accrualRate, maxAccumulation, minimumNoticeDays) round-trip as `null` through create/update/find — a null DB column maps to a null entity field and vice versa, never to undefined or 0.
- Reuse or extend `LeavePolicy`: `createdAt` and `updatedAt` are always Date instances on read (the mapRow helper wraps the DB timestamp string with `new Date(...)`), and `updatedAt` is refreshed to NOW() on every successful update.
### Interface contract — expose these operations (their shape is yours)
- IPolicyRepository.findById(id) — Returns the mapped LeavePolicy when a row matches, null when no row matches; does not throw on not-found.
- IPolicyRepository.findByLeaveType(leaveType) — Returns an array (possibly empty) of mapped policies whose leave_type equals the supplied LeaveType value; never null.
- IPolicyRepository.findActive() — Returns an array (possibly empty) of mapped policies where is_active is true; never null.
- IPolicyRepository.create(policy) — Persists the policy (omitting id/createdAt/updatedAt) via INSERT ... RETURNING * and returns the mapped entity with DB-generated id and timestamps; a unique-constraint violation on leave_type propagates as a pg error (no swallowing).
- IPolicyRepository.update(id, data) — idempotent; Applies only the supplied (defined) fields plus updated_at=NOW(); returns the updated entity, null when no row matches the id; when no updatable fields are supplied it falls back to findById (a read, not a write) and returns that result or null.
### Integration points — connect to these
- src/shared/types/index.ts (LeaveType) — The policy module imports the LeaveType enum from shared/types for the LeavePolicy.leaveType field and the findByLeaveType parameter; this is the Phase 1 dependency declared in the reconciled dependency map (policy → shared-types).
- src/shared/db/connection.ts (pool) — PolicyRepository obtains the pg Pool from the shared db connection to execute all queries against the leave_policies table, satisfying GP-001 (all DB access through the repository layer).
- src/modules/leave/ (future Phase 4/9) and src/modules/balance/ (future Phase 5) — Downstream modules consume LeavePolicy and IPolicyRepository via the policy barrel to validate leave requests (policy must be ACTIVE, entitlement/notice rules) and to seed balance entitlements; the barrel's exported symbols are the contract those phases depend on.

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