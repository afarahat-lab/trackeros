# Implement this phase: Phase 10: LeaveRequest service, controller, routes, and business-day utility

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/e207b7c2-5967-4897-aeeb-2fac2e370ce3/10`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the leave-request service, controller, routes, and a shared business-day utility. This phase depends on:
- `src/modules/leave-request/leave-request.model.ts` and `src/modules/leave-request/leave-request.repository.ts` from Phase 5
- `src/modules/audit/audit.model.ts` and `src/modules/audit/audit.repository.ts` from Phase 6
- `src/modules/employee/employee.service.ts` from Phase 8
- `src/modules/leave-balance/leave-balance.service.ts` from Phase 9
- `src/modules/notification/notification.service.ts` from Phase 9
- `src/shared/types/index.ts` from Phase 1
Read all before generating.

Files to create (approximately 5):

1. `src/shared/utils/business-day.ts` — Export a single function `countBusinessDays(startDate: Date, endDate: Date, holidays: Date[]): number` that counts weekdays (Mon–Fri) between two dates inclusive, excluding weekends and the provided holiday dates. Export a constant `DEFAULT_HOLIDAYS: Date[]` as an empty array (placeholder for the future holidays table).

2. `src/modules/leave-request/leave-request.service.interface.ts` — Define `ILeaveRequestService`:
   - `submitDraft(requestId: string, employeeId: string): Promise<LeaveRequest>` — transitions DRAFT→SUBMITTED. Validates the request belongs to the employee. Looks up active policy via `ILeavePolicyService`. Computes business days via `countBusinessDays`. Ensures balance exists (initializes if needed via `ILeaveBalanceService.initializeBalance`). Atomically deducts days via `ILeaveBalanceService.deductDays`. If employee has no manager (`managerId === null`), escalates to HR admin role (logs escalation; actual HR routing deferred). Creates audit record. Sends notification.
   - `approveRequest(requestId: string, approverId: string): Promise<LeaveRequest>` — transitions SUBMITTED→APPROVED. Validates approver is the employee's manager or HR admin. Sets `approvedBy`, `approvedAt`. Creates audit. Sends notification.
   - `rejectRequest(requestId: string, approverId: string, rejectionReason: string): Promise<LeaveRequest>` — transitions SUBMITTED→REJECTED. Requires non-empty `rejectionReason`. Validates approver authority. Restores balance days via `ILeaveBalanceService.restoreDays`. Creates audit. Sends notification.
   - `cancelRequest(requestId: string, employeeId: string): Promise<LeaveRequest>` — transitions SUBMITTED/APPROVED→CANCELLED. Validates ownership. Restores balance days if previously deducted. Sets `cancelledAt`. Creates audit. Sends notification.
   - `getRequestById(id: string): Promise<LeaveRequest | null>`
   - `getEmployeeRequests(employeeId: string): Promise<LeaveRequest[]>`
   - `getPendingForManager(managerId: string): Promise<LeaveRequest[]>`

3. `src/modules/leave-request/leave-request.service.ts` — Implement `LeaveRequestService` class implementing `ILeaveRequestService`. Inject via constructor: `ILeaveRequestRepository`, `ILeaveBalanceService`, `IEmployeeService`, `ILeavePolicyService`, `IAuditRepository`, `INotificationService`. All state-transition methods must validate the current status before proceeding. Use `countBusinessDays` for day calculations. The `remainingDays` check in submit must use the formula `totalEntitlement - usedDays - requestedDays >= 0`.

4. `src/modules/leave-request/leave-request.controller.ts` — Define `LeaveRequestController` class with Fastify-compatible handler methods:
   - `submit(request, reply)` — extracts `requestId` from params, `employeeId` from authenticated user context
   - `approve(request, reply)` — extracts `requestId` from params, `approverId` from auth context
   - `reject(request, reply)` — extracts `requestId` from params, `rejectionReason` from body, `approverId` from auth
   - `cancel(request, reply)` — extracts `requestId` from params, `employeeId` from auth
   - `getById(request, reply)`, `getMyRequests(request, reply)`, `getPendingForManager(request, reply)`
   Each handler validates inputs (GP-003), calls the service, and returns appropriate HTTP status codes.

5. `src/modules/leave-request/leave-request.routes.ts` — Export `leaveRequestRoutes` Fastify plugin function registering all routes under prefix `/api/leave-requests`:
   - `POST /api/leave-requests/:requestId/submit`
   - `POST /api/leave-requests/:requestId/approve`
   - `POST /api/leave-requests/:requestId/reject`
   - `POST /api/leave-requests/:requestId/cancel`
   - `GET /api/leave-requests/:requestId`
   - `GET /api/leave-requests/my`
   - `GET /api/leave-requests/pending`

6. Update `src/modules/leave-request/index.ts` to export all new symbols.

Include Jest unit tests at `tests/unit/modules/leave-request/leave-request.service.spec.ts` and `tests/unit/shared/utils/business-day.spec.ts`.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decision (apply consistently across annual, sick, and emergency leave):

1. Fiscal/leave year = CALENDAR YEAR (Jan 1 – Dec 31). Derive fiscalYear = the calendar year of the request start_date. Not tenant-configurable for now.

2. Day counting = BUSINESS DAYS ONLY, excluding weekends AND public holidays, applied uniformly to ALL leave types. Introduce a `holidays` table (public-holiday calendar) used by a single shared day-count function so every call site (balance sufficiency check, deduction, restoration) computes identically. Whole days only — no half-day or partial-day leave.

3. Employee with no manager (managerId is null): ESCALATE to the HR admin role for approval. Do NOT auto-approve and do NOT block submission.

4. leave_balances.used_days = DENORMALIZED COUNTER and the source of truth (balance reads are O(1)). Deduct-on-submission: increment used_days atomically, in the same transaction, when a LeaveRequest is SUBMITTED (reserving the balance so an employee cannot over-book). Restore-on-reject/cancel: decrement used_days when that request is REJECTED or CANCELLED. Approval does NOT change used_days again. A submission must fail if it would drive remaining below zero.

5. remainingDays = COMPUTED/DERIVED, never stored: remainingDays = totalEntitlement - usedDays, calculated at query time. All consumers use this one formula; no code path writes remainingDays directly.

6. RBAC (GP-005): every endpoint enforces role-based access control — an employee may act only on their own requests; managers/HR admins on those they oversee. Validate all inputs at the API boundary (GP-003) before calling the service. [BINDING RULE — operator decision resolving: What is the fiscal year definition — calendar year (Jan 1 – Dec 31) or a custom fiscal year (e.g., Apr 1 – Mar 31)?; Should leave day counting use calendar days or business days (excluding weekends and/or public holidays)?; Should the system support half-day leave requests?; Should leave balances be pre-seeded at the start of each fiscal year, or lazily initialized on first request?; How are leave days counted — calendar days or business days (Mon–Fri excluding holidays)?; When does the fiscal year start, and should it be configurable per organization?; apply everywhere these apply, not in one place only]

## Authoritative entity shape (from the reconciled architecture — MANDATORY, not your choice)
The entities below are shared, cross-module DATA CONTRACTS. Implement each one with EXACTLY these fields and types — identical names and types, with no additions, renames, splits (e.g. do NOT split a `fullName` into first/last), or omissions. This is a fixed contract other modules and later phases depend on; it is NOT an implementation choice, and it OVERRIDES any field list you might infer from PLAN.md or the phase description:
- `LeaveRequest` — the entity MUST have exactly these fields:
    - id: string
    - employeeId: string
    - leaveTypeId: string
    - startDate: Date
    - endDate: Date
    - reason: string | undefined
    - rejectionReason: string | undefined
    - status: LeaveStatus
    - approvedBy: string | null
    - approvedAt: Date | null
    - cancelledAt: Date | null
    - createdAt: Date
    - updatedAt: Date

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