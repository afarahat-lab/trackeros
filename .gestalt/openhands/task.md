# Implement this phase: Phase 8a: Leave Service — Foundation, Errors & CRUD

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/4fbbfee4-4feb-4a2b-8127-85025f82af24/8`. Do not clone anything; work only in this directory.

## What to build
File src/modules/leave/leave.service.ts exists and compiles without errors
All 4 custom error classes are exported and have correct properties
ILeaveService interface is exported with all 8 method signatures
LeaveService class is exported with constructor injection of all 5 dependencies
create() validates with Zod, enforces employee-self-only, persists DRAFT, writes audit CREATE
update() validates DRAFT-only, employee-ownership, applies partial updates, writes audit UPDATE
findById() enforces RBAC (employee/manager/hr_admin) and throws on unauthorized access
findByEmployee() enforces same RBAC and delegates filtering to repository
submit/approve/reject/cancel are stubbed to throw 'Not implemented'

## Success criteria
Create `src/modules/leave/leave.service.ts`. This sub-phase depends on all prior phases — read `src/modules/leave/leave.model.ts`, `src/modules/leave/leave.repository.ts`, `src/modules/leave/leave.validation.ts` from Phase 7, `src/modules/balance/balance.service.ts` from Phase 6, `src/modules/audit/audit.service.ts` from Phase 5, `src/modules/notification/notification.service.ts` from Phase 4, `src/modules/policy/policy.model.ts` from Phase 3, `src/modules/employee/employee.model.ts` from Phase 2, and `src/shared/types/index.ts` + `src/shared/utils/business-days.ts` from Phase 1 — before generating any code.

Implement in this sub-phase:

1. **Custom error classes** — define and export:
   - `InsufficientBalanceError` (extends Error, includes remainingBalance and requestedDays properties)
   - `ApproverNotAuthorizedError` (extends Error, includes approverId and requiredRole)
   - `LeaveRequestNotFoundError` (extends Error, includes leaveRequestId)
   - `InvalidStateTransitionError` (extends Error, includes currentStatus and targetStatus)

2. **ILeaveService interface** — declare all method signatures: `create`, `update`, `submit`, `approve`, `reject`, `cancel`, `findById`, `findByEmployee`. (Method bodies for submit/approve/reject/cancel will be implemented in Phase 8b; stub them to throw `new Error('Not implemented')` for now.)

3. **LeaveService class** — constructor injects: `LeaveRepository`, `BalanceService`, `AuditService`, `NotificationService`, `LeavePolicyRepository` (or model), `EmployeeRepository` (or model). Store as private readonly fields.

4. **`create(dto: CreateLeaveRequestDto, actor: AuthenticatedUser): Promise<LeaveRequest>`** — validate dto via Zod schema from leave.validation.ts. Employee can only create for themselves (actor.employeeId must match dto.employeeId). Generate a unique ID. Create the LeaveRequest with status DRAFT. Persist via repository. Write audit record (action: CREATE, entity: 'leave_request', entityId). Return the created request.

5. **`update(leaveRequestId: string, dto: UpdateLeaveRequestDto, actor: AuthenticatedUser): Promise<LeaveRequest>`** — fetch the request, throw LeaveRequestNotFoundError if missing. Only DRAFT status allowed (else throw InvalidStateTransitionError). Only the owning employee can update (actor.employeeId === request.employeeId). Validate dto via Zod partial schema. Apply allowed field updates (startDate, endDate, leaveTypeId, reason). Persist via repository. Write audit record (action: UPDATE). Return updated request.

6. **`findById(id: string, actor: AuthenticatedUser): Promise<LeaveRequest>`** — fetch request, throw LeaveRequestNotFoundError if missing. RBAC: employee sees own only; manager sees own + direct reports (look up employee by request.employeeId, check managerId === actor.employeeId); hr_admin sees all. Throw ApproverNotAuthorizedError if unauthorized.

7. **`findByEmployee(employeeId: string, queryParams: LeaveRequestQueryParams, actor: AuthenticatedUser): Promise<LeaveRequest[]>`** — same RBAC rules as findById. Delegate to repository with filters from queryParams (status, dateRange, leaveTypeId, pagination).

Stub methods for submit, approve, reject, cancel — each throws `new Error('Not implemented — see Phase 8b')`. These stubs ensure the file compiles and the interface is satisfied.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decision (apply consistently across annual, sick, and emergency leave):

1. Fiscal/leave year = CALENDAR YEAR (Jan 1 – Dec 31). fiscalYear = the calendar year of the request start_date. Not tenant-configurable.

2. Day counting = BUSINESS DAYS ONLY, excluding weekends AND public holidays, uniform across ALL leave types. One shared countBusinessDays function + a `holidays` table used by every call site (balance check, deduction, restoration). Whole days only. Compare dates by CALENDAR-DATE equality in UTC (normalize to UTC midnight; compare YYYY-MM-DD), never by raw timestamp.

3. Employee with no manager (managerId null): ESCALATE to the HR admin role for approval. Do NOT auto-approve and do NOT block submission.

4. leave_balances.used_days = DENORMALIZED COUNTER, source of truth (O(1) reads). Deduct-on-submission: increment used_days atomically in the same transaction when a LeaveRequest is SUBMITTED. Restore-on-reject/cancel: decrement when REJECTED or CANCELLED. Approval does NOT change used_days again. Submission fails if it would drive remaining below zero.

5. remainingDays = COMPUTED/DERIVED, never stored: totalEntitlement - usedDays, at query time. No code writes remainingDays directly.

6. RBAC (GP-005): every endpoint enforces role-based access control (employee acts only on own requests; managers/HR admins on those they oversee). The authenticated identity/role comes from `request.user` = { id, role }, role ∈ 'employee'|'manager'|'hr_admin', populated by the application's EXISTING auth middleware — do NOT build/mock auth in this feature; the controller only CONSUMES request.user (401 if absent). Declare a concrete `AuthenticatedUser { id: string; role: 'employee'|'manager'|'hr_admin' }` TYPE (no runtime middleware). Validate all inputs at the API boundary (GP-003) before calling the service (400 on invalid). Do NOT add a role field to the Employee entity.

7. Service authorization: thread the actor's role INTO the service — approve(leaveRequestId, approverId, approverRole), reject(..., approverRole). The controller reads request.user, passes id + role; the service enforces (approver must be the employee's manager, or hr_admin when no manager, else throw ApproverNotAuthorizedError). Role is an explicit parameter, never ambient state inside the service.

8. Test files use the project's Jest convention — `*.test.ts` under `tests/` (matching the configured testMatch), NOT `.spec.ts`. Do not change the Jest config. [BINDING RULE — operator decision resolving: How is the fiscal year defined for leave balances — calendar year (Jan 1 – Dec 31), a configurable start month, or company-specific fiscal calendar?; How is totalEntitlement determined for an employee hired mid-year — full annual entitlement or pro-rated?; Who is authorised to cancel a LeaveRequest? Can a manager or HR admin cancel an approved leave on behalf of the employee?; Does emergency leave have special domain behaviour (e.g. bypassing minimum notice, auto-approval) or does it follow the same rules as other leave types governed by their LeavePolicy?; How should partial-day leave deductions be rounded?; How are leave days counted — calendar days or business/working days?; What is the fiscal-year boundary for leave balances?; How are leave requests spanning two fiscal years handled for balance deduction?; What are the valid values for LeaveBalance.status?; apply everywhere these apply, not in one place only]

## Authoritative entity shape (from the reconciled architecture — MANDATORY, not your choice)
The entities below are shared, cross-module DATA CONTRACTS. Implement each one with EXACTLY these fields and types — identical names and types, with no additions, renames, splits (e.g. do NOT split a `fullName` into first/last), or omissions. This is a fixed contract other modules and later phases depend on; it is NOT an implementation choice, and it OVERRIDES any field list you might infer from PLAN.md or the phase description:
- `Employee` — the entity MUST have exactly these fields:
    - id: string
    - employeeNumber: string
    - firstName: string
    - lastName: string
    - email: string
    - managerId: string | null
    - department: string | null
    - hireDate: Date
    - terminationDate: Date | null
    - employmentStatus: EmploymentStatus
    - createdAt: Date
    - updatedAt: Date
    - deletedAt: Date | null

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