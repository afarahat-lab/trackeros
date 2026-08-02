# Implement this phase: Phase 5: Leave module — model and repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/c8e3d826-436d-4da1-aaf8-6a4bd895c61c/6`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Build the leave module's domain model and repository layer. Depends on src/shared/types/enums.ts and src/shared/types/base-entity.interface.ts from Phase 1 — read both before generating.

Files to create (3 source files):

1. **src/modules/leave/leave.model.ts** — Define `LeaveRequest` entity extending `BaseEntity` with exact fields: employeeId (string), leavePolicyId (string), startDate (Date), endDate (Date), reason (string | undefined), status (LeaveRequestStatus), approvedBy (string | null), approvedAt (Date | null), rejectedBy (string | null), rejectedAt (Date | null), rejectionReason (string | null), cancelledBy (string | null), cancelledAt (Date | null). Import BaseEntity from ../../shared/types/base-entity.interface and LeaveRequestStatus from ../../shared/types/enums.

2. **src/modules/leave/leave.repository.ts** — Define `ILeaveRequestRepository` interface: findById(id: string): Promise<LeaveRequest | null>, findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>, findByStatus(status: LeaveRequestStatus): Promise<LeaveRequest[]>, findByEmployeeAndDateRange(employeeId: string, startDate: Date, endDate: Date): Promise<LeaveRequest[]>, create(request: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveRequest>, update(id: string, data: Partial<LeaveRequest>): Promise<LeaveRequest | null>. Implement `PgLeaveRequestRepository` using the shared pg pool from src/shared/db/connection.ts.

3. **src/modules/leave/index.ts** — Barrel export of LeaveRequest, ILeaveRequestRepository, PgLeaveRequestRepository.

Include Jest unit tests in **tests/unit/modules/leave/leave.repository.test.ts**.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decision (apply consistently across annual, sick, and emergency leave):

1. Fiscal/leave year = CALENDAR YEAR (Jan 1 – Dec 31). Derive fiscalYear = the calendar year of the request start_date. Not tenant-configurable for now.

2. Day counting = BUSINESS DAYS ONLY, excluding weekends AND public holidays, applied uniformly to ALL leave types. Introduce a `holidays` table (public-holiday calendar) used by a single shared day-count function so every call site (balance sufficiency check, deduction, restoration) computes identically. Whole days only — no half-day or partial-day leave.

3. Employee with no manager (managerId is null): ESCALATE to the HR admin role for approval. Do NOT auto-approve and do NOT block submission.

4. leave_balances.used_days = DENORMALIZED COUNTER and the source of truth (balance reads are O(1)). Deduct-on-submission: increment used_days atomically, in the same transaction, when a LeaveRequest is SUBMITTED (reserving the balance so an employee cannot over-book). Restore-on-reject/cancel: decrement used_days when that request is REJECTED or CANCELLED. Approval does NOT change used_days again. A submission must fail if it would drive remaining below zero.

5. remainingDays = COMPUTED/DERIVED, never stored: remainingDays = totalEntitlement - usedDays, calculated at query time. No code path writes remainingDays directly.

6. RBAC (GP-005): every endpoint enforces role-based access control — an employee may act only on their own requests; managers/HR admins on those they oversee. The authenticated user identity/role comes from the request context (`request.user` = { id, role }, role ∈ 'employee'|'manager'|'hr_admin'), populated by the app's existing auth middleware — do NOT build auth in this feature; the controller only CONSUMES `request.user` (401 if absent). Validate all inputs at the API boundary (GP-003) before calling the service (400 on invalid; e.g. startDate not in the past, startDate <= endDate, minimum notice). Do NOT add a role field to the Employee entity — role comes from `request.user`.

7. Test files use the project's Jest convention — `*.test.ts` under `tests/` (matching the configured testMatch), NOT `.spec.ts`; do not change the Jest config. [BINDING RULE — operator decision resolving: Do unused leave days carry over to the next fiscal year, and if so, what is the cap?; What is the minimum granularity of leave — full days, half-days, or hours?; Do weekends and public holidays count as leave days consumed from the balance?; When a leave request spans two fiscal years, how are days allocated to each year's balance?; How is the fiscal year determined for leave balances? The domain model includes fiscalYear but the mapping rule (calendar year Jan–Dec, fiscal year Jul–Jun, or company-specific) is not specified in the feature description.; How is leave_balances.used_days computed — is it derived on-the-fly by aggregating approved leave_request days for that employee/policy/fiscal-year, or is it a stored counter that is incremented atomically when a leave request is approved (and decremented on cancellation)?; How are leave days counted — calendar days (inclusive start-to-end) or business/working days only? And when a leave request spans two fiscal years, how are days allocated to each year's balance?; How is remainingDays computed — stored as a derived column (totalDays - usedDays) in the DB, or computed at query time? If stored, what keeps it consistent with usedDays after every deduction/restore?; What is the fiscal-year boundary rule? Is it calendar year (Jan 1–Dec 31), a configurable start month, or per-company? Does a leave spanning the boundary consume days from the start-date fiscal year, the end-date fiscal year, or split proportionally?; apply everywhere these apply, not in one place only]

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The LeaveRequest entity must extend the BaseEntity interface exactly as defined in this file (id: string, createdAt: Date, updatedAt: Date). The model file must import BaseEntity from this deep path, not from the shared barrel — matching the established import pattern in employee.model.ts, policy.model.ts, and balance.model.ts. (see `src/shared/types/base-entity.interface.ts`)
- The LeaveRequestStatus enum must be imported from this file and used as the type for the status field. The enum values (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED) must not be redefined or duplicated — the model and repository must reference the single source of truth here. (see `src/shared/types/enums.ts`)
- The repository implementation must import and use the shared pool exported from this file (export const pool). It must not create its own Pool instance. This matches the pattern in employee.repository.ts, policy.repository.ts, and balance.repository.ts. (see `src/shared/db/connection.ts`)
- The repository implementation must follow the same structural pattern as this file: a private snake_case Row interface, a rowToEntity mapper function that casts the status string to the enum type via `as`, create using randomUUID() + INSERT ... RETURNING *, and update using read-then-write (findById then merge then UPDATE ... RETURNING *). The leave repository must be structurally consistent with this established pattern. (see `src/modules/policy/policy.repository.ts`)
- The barrel index.ts must follow the same export pattern as this file: type-only exports for the entity and interface (export type { ... }), and a value export for the Pg class (export { PgLeaveRequestRepository }). The barrel must export exactly LeaveRequest, ILeaveRequestRepository, and PgLeaveRequestRepository. (see `src/modules/balance/index.ts`)
- The unit test file must follow the same structural pattern as this file: jest.mock on the connection module at the top, import pool after the mock, mockQuery helper, makeRow/makeEntity helpers with snake_case overrides, beforeEach with new repo + jest.clearAllMocks, and per-method describe blocks covering success/null/error paths. The leave test must be structurally consistent with this established test pattern. (see `tests/unit/modules/balance/balance.repository.test.ts`)
### Entity invariants — enforce these
- Reuse or extend `LeaveRequest`: LeaveRequest must extend BaseEntity, inheriting id (string), createdAt (Date), and updatedAt (Date). The entity is an interface (type-only), not a class — it has no constructor or methods, matching the established model pattern across all prior modules.
- Reuse or extend `LeaveRequest`: The status field must be typed as LeaveRequestStatus (the string enum from src/shared/types/enums.ts), not as a plain string or a union literal. When mapping from a DB row, the raw string value must be cast via `as LeaveRequestStatus` — the same pattern used for LeaveType in the policy module and LeaveBalanceStatus in the balance module.
- Reuse or extend `LeaveRequest`: The reason field is typed as string | undefined (not string | null), distinguishing it from the six approval/rejection/cancellation fields which are typed as string | null or Date | null. This matches the reconciled architecture's attribute list exactly.
### Interface contract — expose these operations (their shape is yours)
- ILeaveRequestRepository.findById(id: string): Promise<LeaveRequest | null> — Returns null when no row matches the given id. Rejects (throws) when the underlying pool query fails — errors propagate uncaught, matching the established pattern (no try/catch swallowing in repository methods).
- ILeaveRequestRepository.findByEmployeeId(employeeId: string): Promise<LeaveRequest[]> — Returns an empty array (not null) when no rows match. Rejects on pool error.
- ILeaveRequestRepository.findByStatus(status: LeaveRequestStatus): Promise<LeaveRequest[]> — Returns an empty array when no rows match the given status. Rejects on pool error.
- ILeaveRequestRepository.findByEmployeeAndDateRange(employeeId: string, startDate: Date, endDate: Date): Promise<LeaveRequest[]> — Returns an empty array when no overlapping rows are found. Rejects on pool error. Must not filter by status — returns all overlapping requests regardless of lifecycle state.
- ILeaveRequestRepository.create(request: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveRequest> — Generates a new UUID for id and sets createdAt/updatedAt server-side. Persists via INSERT ... RETURNING * and returns the fully-populated entity from the returned row. Rejects on unique-constraint violations or connection errors — errors propagate uncaught.
- ILeaveRequestRepository.update(id: string, data: Partial<LeaveRequest>): Promise<LeaveRequest | null> — Performs read-then-write: first fetches the existing row via findById; returns null immediately if the ID does not exist (no write attempted). Merges partial data over the existing entity, refreshes updatedAt, then writes all columns back via UPDATE ... RETURNING *. Returns the updated entity, or null if the UPDATE returns no rows. Rejects on pool error during either query.
### Integration points — connect to these
- src/shared/types/enums.ts (LeaveRequestStatus enum) — The LeaveRequest model and repository depend on the LeaveRequestStatus enum for typing the status field and casting DB row values. This is a Phase 1 dependency that must already exist.
- src/shared/types/base-entity.interface.ts (BaseEntity interface) — The LeaveRequest entity extends BaseEntity, inheriting id, createdAt, and updatedAt. This is a Phase 1 dependency that must already exist.
- src/shared/db/connection.ts (shared pg pool) — The PgLeaveRequestRepository implementation uses the shared pool for all database queries. This is an existing infrastructure dependency.
- Future Phase 9: leave.service.ts (LeaveRequestService) — The ILeaveRequestRepository interface and PgLeaveRequestRepository class produced in this phase are the data-access layer that the future leave service will consume. The service will call findByEmployeeAndDateRange for overlap detection, create for draft creation, and update for lifecycle transitions. The interface contract established here is the integration boundary.

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