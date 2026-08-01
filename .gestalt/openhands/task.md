# Implement this phase: Phase 4: Leave module — model and repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/35df38af-c9d7-41ee-b412-79ee8d149189/4`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the leave module at `src/modules/leave/`. This phase depends on:
- `src/shared/types/index.ts` from Phase 1 (for LeaveStatus, CreateLeaveRequestDto, UpdateLeaveRequestDto, LeaveRequestQueryParams)
- `src/modules/employee/employee.model.ts` from Phase 2 (for Employee type reference)
- `src/modules/policy/policy.model.ts` from Phase 3 (for LeavePolicy type reference)

Read all three before generating any code.

Files to create:
- `src/modules/leave/leave.model.ts` — Define the **LeaveRequest** entity with EXACT fields: `id: string`, `employeeId: string`, `policyId: string`, `startDate: Date`, `endDate: Date`, `reason: string | undefined`, `status: LeaveStatus` (import from `src/shared/types`), `approvedBy: string | null`, `approvedAt: Date | null`, `rejectionReason: string | null`, `createdAt: Date`, `updatedAt: Date`. Also define **ILeaveRepository** interface with methods: `findById(id: string): Promise<LeaveRequest | null>`, `findByEmployeeId(employeeId: string, params?: LeaveRequestQueryParams): Promise<LeaveRequest[]>`, `findByStatus(status: LeaveStatus): Promise<LeaveRequest[]>`, `create(data: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveRequest>`, `update(id: string, data: Partial<LeaveRequest>): Promise<LeaveRequest | null>`, `updateStatus(id: string, status: LeaveStatus, approvedBy?: string | null, rejectionReason?: string | null): Promise<LeaveRequest | null>`.
- `src/modules/leave/leave.repository.ts` — Implement **LeaveRepository** class implementing ILeaveRepository using the pg pool from `src/shared/db/connection.ts`. Use parameterized queries. The `updateStatus` method must set `approvedAt` to now when status is APPROVED.
- `src/modules/leave/index.ts` — Barrel export of LeaveRequest, ILeaveRepository, LeaveRepository.

Include Jest unit tests in `tests/unit/modules/leave/` mocking the db pool.

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
- The LeaveRepository must replicate the established repository pattern from EmployeeRepository: module-level `pool` import from `../../shared/db/connection`, parameterized SQL ($1, $2, …), a private `mapRow` helper converting snake_case columns to camelCase entity fields, `findById` returning null on empty rows, `create` using INSERT ... RETURNING *, and `update` building a dynamic SET clause via a fieldMap with findById fallback when no fields are supplied. (see `src/modules/employee/employee.repository.ts`)
- The LeaveRepository's update method must follow the same dynamic-SET + fieldMap + `updated_at = NOW()` + findById-fallback structure used by PolicyRepository, so the three repositories are structurally consistent. (see `src/modules/policy/policy.repository.ts`)
- The LeaveRequest entity's `status` field and the ILeaveRepository method signatures must import and use LeaveStatus (and LeaveRequestQueryParams) from `shared/types` rather than redefining them, preserving the single source of truth for these types established in Phase 1. (see `src/shared/types/index.ts`)
- The leave barrel index.ts must follow the same export shape as the employee/policy barrels: re-export the entity interface and the repository interface from the model file, and re-export the repository class from the repository file. (see `src/modules/employee/index.ts`)
- The leave repository tests must follow the established test conventions: jest.mock('shared/db/connection', () => ({ pool: { query: jest.fn() } })), a snake_case makeRow(overrides) fixture helper, mockQuery.mockReset() in beforeEach, and assertions on both mapped return values and the exact SQL string + params array passed to pool.query. (see `tests/unit/modules/employee/employee.repository.test.ts`)
- The repository's column mapping must match the reconciled leave_requests schema (id, employee_id, policy_id, leave_type, start_date, end_date, status, reason, rejection_reason, approved_by, approved_at, created_at, updated_at), mapping camelCase entity fields to these snake_case columns; the leave_type column is present in the schema but excluded from the LeaveRequest entity surface per the task spec. (see `.gestalt/architecture/reconciled.json`)
### Entity invariants — enforce these
- Reuse or extend `LeaveRequest`: A LeaveRequest's status is always one of the LeaveStatus values (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED); the repository must never persist or return a status outside this set, and the entity's status field is typed as LeaveStatus (not a free string).
- Reuse or extend `LeaveRequest`: approvedAt is non-null only when the request has been approved (status APPROVED with approvedBy set); the updateStatus operation enforces this by setting approved_at = NOW() exclusively on the APPROVED transition. A request that is DRAFT/SUBMITTED/REJECTED/CANCELLED has approvedAt = null.
- Reuse or extend `LeaveRequest`: rejectionReason is non-null only for REJECTED requests; approvedBy is non-null only for APPROVED requests. The repository preserves these nullability relationships when mapping rows and when updating status.
- Reuse or extend `LeaveRequest`: Every persisted LeaveRequest has server-generated id, createdAt, and updatedAt (the create operation omits these from its input type via Omit and relies on INSERT ... RETURNING * to populate them); a caller cannot supply id/createdAt/updatedAt through the create signature.
### Interface contract — expose these operations (their shape is yours)
- ILeaveRepository.findById(id) — Returns null when no row matches the id (not undefined, not a thrown error); returns a fully mapped LeaveRequest when found.
- ILeaveRepository.findByEmployeeId(employeeId, params?) — Returns an empty array (never null) when no rows match; applies optional LeaveRequestQueryParams filters as a dynamic WHERE clause with LIMIT/OFFSET.
- ILeaveRepository.findByStatus(status) — Returns an empty array (never null) when no rows match the given LeaveStatus.
- ILeaveRepository.create(data) — Persists via INSERT ... RETURNING * and returns the mapped LeaveRequest with server-generated id/createdAt/updatedAt; input type excludes id/createdAt/updatedAt via Omit.
- ILeaveRepository.update(id, data) — Returns null when the target row does not exist; falls back to findById (returning the current row) when no updatable fields are supplied; builds a dynamic SET clause only for provided fields.
- ILeaveRepository.updateStatus(id, status, approvedBy?, rejectionReason?) — Returns null when the target row does not exist; sets approved_at = NOW() when status is APPROVED (and persists approvedBy); does not set approved_at to now for non-APPROVED statuses.
### Integration points — connect to these
- src/shared/types/index.ts (Phase 1) — Provides LeaveStatus, LeaveRequestQueryParams, CreateLeaveRequestDto, and UpdateLeaveRequestDto — the leave model imports LeaveStatus for the entity's status field and LeaveRequestQueryParams for the findByEmployeeId signature.
- src/shared/db/connection.ts — Provides the pg Pool instance the LeaveRepository imports at module level to execute parameterized queries against the leave_requests table.
- src/modules/employee/employee.model.ts (Phase 2) — Employee is a type reference for the leave_requests.employee_id and leave_requests.approved_by foreign keys; referenced as a type only (no runtime import in the model per task spec).
- src/modules/policy/policy.model.ts (Phase 3) — LeavePolicy is a type reference for the leave_requests.policy_id foreign key; referenced as a type only (no runtime import in the model per task spec).
- Phase 9 — Leave service — The ILeaveRepository interface and LeaveRepository implementation produced in this phase are the persistence contract the future LeaveService will depend on for submit/approve/reject/cancel orchestration; the interface signatures must remain stable for that consumer.

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