# Implement this phase: Phase 6: LeaveRequest module (model + repository)

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/8177937e-ec7c-4649-b943-9d9104b82731/6`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Build the LeaveRequest domain model and repository. This phase depends on `src/shared/types/leave-request-status.enum.ts` from Phase 1, `src/modules/employee/employee.model.ts` from Phase 2, and `src/modules/leave-policy/leave-policy.model.ts` from Phase 4 — read all three before generating any code.

Files to create:
- `src/modules/leave-request/leave-request.model.ts` — Define the `LeaveRequest` interface with exact fields: id: string, employeeId: string, leavePolicyId: string, startDate: Date, endDate: Date, reason: string | undefined, status: LeaveRequestStatus (import from `src/shared/types/leave-request-status.enum.ts`), approvedBy: string | null, approvedAt: Date | null, createdAt: Date, updatedAt: Date. Also define `CreateLeaveRequestDto` with fields: employeeId, leavePolicyId, startDate, endDate, reason (optional).
- `src/modules/leave-request/leave-request.repository.ts` — Define `ILeaveRequestRepository` interface with methods: findById(id: string): Promise<LeaveRequest | null>, findByEmployee(employeeId: string): Promise<LeaveRequest[]>, findByStatus(status: LeaveRequestStatus): Promise<LeaveRequest[]>, create(dto: CreateLeaveRequestDto): Promise<LeaveRequest>, updateStatus(id: string, status: LeaveRequestStatus, approvedBy?: string | null, approvedAt?: Date | null): Promise<LeaveRequest>. Implement `LeaveRequestRepository` class using the existing `pool` from `src/shared/db/connection.ts` with parameterized SQL.
- `src/modules/leave-request/index.ts` — Barrel export of model and repository.

Include Jest unit tests in `tests/unit/modules/leave-request/leave-request.repository.test.ts`.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decision (apply consistently across annual, sick, and emergency leave):

1. Fiscal/leave year = CALENDAR YEAR (Jan 1 – Dec 31). Derive fiscalYear = the calendar year of the request start_date. Not tenant-configurable for now.

2. Day counting = BUSINESS DAYS ONLY, excluding weekends AND public holidays, applied uniformly to ALL leave types. A single shared countBusinessDays function + a `holidays` table (public-holiday calendar) is used by every call site (balance sufficiency check, deduction, restoration). Whole days only — no half-day/partial-day leave. Compare dates by CALENDAR-DATE equality in UTC (normalize each day/holiday/weekend check to UTC midnight; compare the YYYY-MM-DD triple), never by raw timestamp — so a holiday matches regardless of time-of-day/timezone.

3. Employee with no manager (managerId is null): ESCALATE to the HR admin role for approval. Do NOT auto-approve and do NOT block submission.

4. leave_balances.used_days = DENORMALIZED COUNTER and the source of truth (O(1) reads). Deduct-on-submission: increment used_days atomically, in the same transaction, when a LeaveRequest is SUBMITTED (reserving the balance so an employee cannot over-book). Restore-on-reject/cancel: decrement used_days when that request is REJECTED or CANCELLED. Approval does NOT change used_days again. A submission must fail if it would drive remaining below zero.

5. remainingDays = COMPUTED/DERIVED, never stored: remainingDays = totalEntitlement - usedDays, at query time. No code path writes remainingDays directly.

6. RBAC (GP-005): every endpoint enforces role-based access control — an employee may act only on their own requests; managers/HR admins on those they oversee. The authenticated identity/role comes from the request context (`request.user` = { id, role }, role ∈ 'employee'|'manager'|'hr_admin'), populated by the app's existing auth middleware — do NOT build auth here; the controller only CONSUMES request.user (401 if absent). Validate all inputs at the API boundary (GP-003) before calling the service (400 on invalid: startDate not in the past, startDate <= endDate, minimum notice). Do NOT add a role field to the Employee entity.

7. Service authorization: thread the actor's role INTO the service — approve(leaveRequestId, approverId, approverRole) and reject(..., approverRole). The controller reads request.user and passes id + role; the service enforces the business rule (approver must be the employee's manager, or hr_admin when no manager, else throw ApproverNotAuthorizedError). Role is an explicit parameter, never ambient state read inside the service.

8. Test files use the project's Jest convention — `*.test.ts` under `tests/` (matching the configured testMatch), NOT `.spec.ts`; do not change the Jest config. [BINDING RULE — operator decision resolving: How is used_days on leave_balances computed — derived live from approved leave_requests or stored counter incremented/decremented on state changes?; Are leave days always whole days, or does the system need to support half-day or hourly leave requests?; When should leave balance be deducted — at application time or at approval time?; How is used_days on leave_balances computed — is it derived live from approved leave_requests (SUM of day counts where status=APPROVED) or is it a stored counter incremented/decremented on approval/rejection/cancellation?; apply everywhere these apply, not in one place only]

## Authoritative entity shape (from the reconciled architecture — MANDATORY, not your choice)
The entities below are shared, cross-module DATA CONTRACTS. Implement each one with EXACTLY these fields and types — identical names and types, with no additions, renames, splits (e.g. do NOT split a `fullName` into first/last), or omissions. This is a fixed contract other modules and later phases depend on; it is NOT an implementation choice, and it OVERRIDES any field list you might infer from PLAN.md or the phase description:
- `LeaveRequest` — the entity MUST have exactly these fields:
    - id: string
    - employeeId: string
    - leavePolicyId: string
    - startDate: Date
    - endDate: Date
    - reason: string | undefined
    - status: LeaveRequestStatus
    - approvedBy: string | null
    - approvedAt: Date | null
    - createdAt: Date
    - updatedAt: Date

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The LeaveRequestRepository must follow the identical structural pattern as LeaveBalanceRepository: `import { Pool, QueryResult } from 'pg'` + `import { pool } from '../../shared/db/connection'`, constructor `constructor(dbPool: Pool = pool)`, a private `rowToLeaveRequest` mapper function, `await this.db.query(sql, [params])`, single-row methods returning null when `rows.length === 0`, and every method wrapped in `try/catch (error: unknown)` throwing `new Error('Failed to <action>: ${error instanceof Error ? error.message : String(error)}')`. (see `src/modules/leave-balance/leave-balance.repository.ts`)
- The row mapper's null/undefined handling must match the established conventions: optional fields (reason) use `(row.col as T | null) ?? undefined` (DB null → undefined), nullable fields (approvedBy) use `(row.col as string) ?? null`, nullable dates (approvedAt) use `row.col ? new Date(row.col as string) : null`, and all dates use `new Date(row.col as string)` — mirroring rowToLeavePolicy and rowToEmployee. (see `src/modules/leave-policy/leave-policy.repository.ts`)
- The LeaveRequest interface's status field and the repository's findByStatus/updateStatus parameters must use the LeaveRequestStatus enum imported from the shared-types module (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED) — the enum must not be redefined or duplicated in the leave-request module. (see `src/shared/types/leave-request-status.enum.ts`)
- The leave-request barrel (index.ts) must follow the same export pattern as the leave-balance and leave-policy barrels: `export { <ModelType>, <DtoType> } from './<module>.model'` and `export { I<Module>Repository, <Module>Repository } from './<module>.repository'`. (see `src/modules/leave-balance/index.ts`)
- The repository test suite must follow the established test pattern: `jest.mock('pg', () => { const mockQuery = jest.fn(); return { Pool: jest.fn().mockImplementation(() => ({ query: mockQuery })) }; })`, `Record<string, unknown>` row fixtures with snake_case keys and ISO date strings, a helper asserting mapped fields match the row, and per-method coverage of happy-path, null/empty, SQL-injection parameterized-query, and error-throw cases. (see `tests/unit/modules/leave-balance/leave-balance.repository.test.ts`)
### Entity invariants — enforce these
- Reuse or extend `LeaveRequest`: A newly created LeaveRequest always begins its lifecycle in the DRAFT status with approvedBy and approvedAt both null; the repository's create must never accept or inject a non-DRAFT initial status.
- Reuse or extend `LeaveRequest`: The reason field follows the optional/undefined convention: a database NULL maps to `undefined` (not `null`) on read, and an omitted/undefined reason on create maps to SQL NULL on write — mirroring the LeavePolicy.accrualRate pattern, distinct from the nullable approvedBy/approvedAt which use `null`.
- Reuse or extend `LeaveRequest`: The leave_requests row references valid employees and leave policies via foreign keys (employee_id → employees.id, leave_policy_id → leave_policies.id, approved_by → employees.id); the repository does not enforce referential integrity itself (the database does) but must persist the provided identifiers as-is.
### Interface contract — expose these operations (their shape is yours)
- findById(id) — single-row lookup by primary key — idempotent; Returns null when no row matches (not an error); throws a typed Error prefixed 'Failed to' when the underlying query rejects.
- findByEmployee(employeeId) — list lookup by employee_id — idempotent; Returns an empty array when no rows match (not an error); throws a typed Error prefixed 'Failed to' when the underlying query rejects.
- findByStatus(status) — list lookup by status column — idempotent; Returns an empty array when no rows match (not an error); throws a typed Error prefixed 'Failed to' when the underlying query rejects.
- create(dto) — INSERT with RETURNING * — Returns the persisted LeaveRequest mapped from the RETURNING row; throws a typed Error prefixed 'Failed to' on any DB failure (including FK constraint violations). Not idempotent — repeated calls create distinct rows.
- updateStatus(id, status, approvedBy?, approvedAt?) — UPDATE with RETURNING * — idempotent; Returns the updated LeaveRequest mapped from the RETURNING row; throws a typed Error prefixed 'Failed to' on any DB failure. Optional approvedBy/approvedAt default to null when omitted.
### Integration points — connect to these
- src/shared/types/leave-request-status.enum.ts (via src/shared/types/index.ts barrel) — The LeaveRequest model and repository depend on the LeaveRequestStatus enum (DRAFT/SUBMITTED/APPROVED/REJECTED/CANCELLED) for the status field and the findByStatus/updateStatus method signatures.
- src/shared/db/connection.ts — The repository imports the shared `pool` (pg Pool) as the default constructor argument for database access, consistent with all existing repositories.
- src/modules/employee/employee.model.ts and src/modules/leave-policy/leave-policy.model.ts — The leave_requests table foreign-keys employee_id → employees.id and leave_policy_id → leave_policies.id; the LeaveRequest model's employeeId and leavePolicyId fields are typed as string references to these entities' ids. No direct code import is required (referential integrity is enforced by the database), but the field semantics must align with these existing models.

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

## Golden principles (NON-NEGOTIABLE — satisfy every one that applies)
These are the project's non-negotiable invariants. A violation is a GOLDEN_PRINCIPLE_BREACH: the quality gate BLOCKS the phase and escalates to a human with NO automatic retry, so it is far more costly than an ordinary finding. Apply EVERY principle relevant to the code you write in this phase — e.g. enforce role-based access control on every API endpoint you add, and validate all inputs at API boundaries before use:
- GP-001 — Repository pattern: All database access goes through repository interfaces. Never query the database directly from services or controllers.
- GP-002 — Audit records: All state-changing operations write an audit record.
- GP-003 — Input validation: Validate all inputs at API boundaries before processing.
- GP-004 — No sensitive data in logs: Never log passwords, tokens, PII, or financial data.
- GP-005 — RBAC enforcement: All API endpoints enforce role-based access control.
- GP-006 — Error handling: No unhandled promise rejections. All async errors are caught and handled.

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