# Implement this phase: Phase 10: Supporting services — Balance, Notification, Audit, Policy, Employee

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/76d847b2-5905-40af-b702-36710232b1e4/10`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the remaining service interfaces and implementations for all supporting modules. This phase depends on all prior model and repository files — read them before generating.

Files to create (approximately 5):

- `src/modules/leave-balance/leave-balance.service.interface.ts` — Define `IBalanceService` interface: getBalance(employeeId: string, leavePolicyId: string, fiscalYear: number): Promise<LeaveBalance>, getBalancesForEmployee(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]>, initializeBalance(employeeId: string, leavePolicyId: string, fiscalYear: number): Promise<LeaveBalance>.
- `src/modules/leave-balance/leave-balance.service.ts` — Implement `BalanceService` class using ILeaveBalanceRepository and ILeavePolicyRepository. `initializeBalance` reads the policy's entitlementDays and creates a balance with totalEntitlement=entitlementDays, usedDays=0, remainingDays=entitlementDays, status='ACTIVE', fiscalYear=current calendar year (hardcoded Jan 1 – Dec 31 per BINDING rule).

- `src/modules/notification/notification.service.interface.ts` — Define `INotificationService` interface: notifyLeaveSubmitted(leaveRequest: LeaveRequest): Promise<LeaveNotification>, notifyLeaveApproved(leaveRequest: LeaveRequest): Promise<LeaveNotification>, notifyLeaveRejected(leaveRequest: LeaveRequest): Promise<LeaveNotification>, notifyLeaveCancelled(leaveRequest: LeaveRequest): Promise<LeaveNotification>, getNotificationsForUser(recipientId: string): Promise<LeaveNotification[]>, markAsRead(id: string): Promise<void>.
- `src/modules/notification/notification.service.ts` — Implement `NotificationService` class using INotificationRepository and IEmployeeRepository. Each notify method creates a LeaveNotification with appropriate type, title, and message, targeting the employee's manager (for SUBMITTED/CANCELLED) or the employee (for APPROVED/REJECTED).

- `tests/unit/modules/leave-balance/leave-balance.service.test.ts` and `tests/unit/modules/notification/notification.service.test.ts` — Jest unit tests with mocked repositories.

The AuditService, LeavePolicyService, and EmployeeService interfaces are declared in the architecture but their full implementations are deferred — create stub interface files only:
- `src/modules/audit/audit.service.interface.ts` — `IAuditService` with logAction(entityType, entityId, action, oldValues, newValues, performedBy): Promise<AuditLog>
- `src/modules/leave-policy/leave-policy.service.interface.ts` — `ILeavePolicyService` with getPolicy(id), getPolicyByType(leaveType), isActive(id)
- `src/modules/employee/employee.service.interface.ts` — `IEmployeeService` with getEmployee(id), getManager(employeeId), isActive(id)

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decision for all questions: (1) Fiscal year = calendar year (Jan 1 to Dec 31), hardcoded — no configurable fiscalYearStart field. (2) Leave duration counts calendar days inclusive — weekends and public holidays ARE counted as leave days; do NOT introduce a holiday calendar entity. (3) Minimum granularity = full-day increments only — leave balances are integers, no half-days, no hours, no time-of-day on startDate/endDate. (4) Day counting from start_date to end_date is calendar days inclusive of both ends: daysRequested = (end_date - start_date) + 1. This single formula is BINDING at every call site (used_days deduction, overlap detection, remaining_days) — no weekend or holiday exclusion anywhere. [BINDING RULE — operator decision resolving: How is the fiscal year boundary defined — calendar year (Jan 1 – Dec 31) or a configurable start month/day? This determines when LeaveBalance transitions from ACTIVE/EXHAUSTED to CLOSED and when new balance records are created.; Should leave duration count weekends and public holidays as leave days, or only business days? The current rule uses calendar days inclusive, but this may not match all organisational policies.; What is the minimum granularity of a leave request — full days, half days, or hours? This affects the daysRequested calculation and balance precision.; How are leave days counted from start_date to end_date — calendar days (inclusive of both ends, e.g. Mon–Fri = 5 days) or business/working days only? This is BINDING across all balance-deduction and overlap-detection call sites.; apply everywhere these apply, not in one place only]

## Authoritative entity shape (from the reconciled architecture — MANDATORY, not your choice)
The entities below are shared, cross-module DATA CONTRACTS. Implement each one with EXACTLY these fields and types — identical names and types, with no additions, renames, splits (e.g. do NOT split a `fullName` into first/last), or omissions. This is a fixed contract other modules and later phases depend on; it is NOT an implementation choice, and it OVERRIDES any field list you might infer from PLAN.md or the phase description:
- `Employee` — the entity MUST have exactly these fields:
    - id: string
    - employeeNumber: string
    - firstName: string
    - lastName: string
    - email: string
    - managerId: string | null
    - department: string
    - hireDate: Date
    - terminationDate: Date | null
    - employmentStatus: 'ACTIVE' | 'INACTIVE' | 'TERMINATED'
    - createdAt: Date
    - updatedAt: Date

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The `BalanceService` must use the same `ILeaveBalanceRepository` interface declared in `src/modules/leave-balance/leave-balance.repository.ts` — specifically `findByEmployeeAndPolicy`, `findByEmployeeId`, `create`, and `update` with their exact signatures. (see `src/modules/leave-balance/leave-balance.repository.ts`)
- The `BalanceService` must use the same `ILeavePolicyRepository` interface declared in `src/modules/leave-policy/leave-policy.repository.ts` — specifically `findById` with its exact signature, to read `entitlementDays` from the policy. (see `src/modules/leave-policy/leave-policy.repository.ts`)
- The `NotificationService` must use the same `INotificationRepository` interface declared in `src/modules/notification/notification.repository.ts` — specifically `create` and `updateStatus` with their exact signatures. (see `src/modules/notification/notification.repository.ts`)
- The `NotificationService` must use the same `IEmployeeRepository` interface declared in `src/modules/employee/employee.repository.ts` — specifically `findById` with its exact signature, to resolve the employee and their managerId. (see `src/modules/employee/employee.repository.ts`)
- The `NotificationService.notify*` methods accept a `LeaveRequest` parameter whose shape must match the `LeaveRequest` interface declared in `src/modules/leave-request/leave-request.model.ts` — specifically the fields `id`, `employeeId`, `leavePolicyId`, `startDate`, `endDate`, `status`. (see `src/modules/leave-request/leave-request.model.ts`)
### Entity invariants — enforce these
- Reuse or extend `LeaveBalance`: At all times, `remainingDays === totalEntitlement - usedDays`. Any mutation to `usedDays` must recalculate `remainingDays` accordingly. The `initializeBalance` method establishes this invariant at creation time by setting `remainingDays = totalEntitlement` when `usedDays = 0`.
- Reuse or extend `LeaveBalance`: Composite uniqueness: at most one `LeaveBalance` row may exist for a given `(employeeId, leavePolicyId, fiscalYear)` tuple. The `initializeBalance` method must enforce this by checking for an existing balance before creating and throwing `BALANCE_ALREADY_EXISTS` if one is found.
- Reuse or extend `LeaveNotification`: When `status` is `PENDING` or `SENT`, `readAt` must be `null`. When `status` is `READ` or `ARCHIVED`, `readAt` must be a non-null `Date`. The `markAsRead` method transitions from `PENDING`/`SENT` to `READ` and sets `readAt` to the current timestamp.
### Interface contract — expose these operations (their shape is yours)
- IBalanceService.initializeBalance — Throws `{ error: string, code: 'POLICY_NOT_FOUND' }` when the leavePolicyId does not resolve to an existing policy. Throws `{ error: string, code: 'BALANCE_ALREADY_EXISTS' }` when a balance already exists for the same (employeeId, leavePolicyId, fiscalYear) tuple.
- INotificationService.notifyLeaveSubmitted — Throws `{ error: string, code: 'EMPLOYEE_NOT_FOUND' }` when the leaveRequest's employeeId does not resolve. Throws `{ error: string, code: 'NO_MANAGER_ASSIGNED' }` when the employee has no managerId.
- INotificationService.markAsRead — idempotent; Throws `{ error: string, code: 'NOTIFICATION_NOT_FOUND' }` when the id does not resolve. Idempotent: calling markAsRead on an already-READ notification is a no-op (no error).
### Integration points — connect to these
- src/modules/leave-balance/index.ts — Must re-export `IBalanceService` and `BalanceService` so the leave-request module (and future modules) can import them via the public barrel.
- src/modules/notification/index.ts — Must re-export `INotificationService` and `NotificationService` so the leave-request module (and future modules) can import them via the public barrel.

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
- Do not redefine a symbol another module already owns. Before declaring an error class, DTO, interface, enum, or constant, check whether a symbol representing the SAME concept is already exported by another module; if so, import it from that module's public entry point instead of declaring a second copy. The test is conceptual identity, NOT name identity — a symbol that shares a name but represents a genuinely DIFFERENT concept (different fields or meaning, owned by THIS module) is a legitimately distinct declaration and is not a violation; only flag a declaration that duplicates the shape and meaning of an existing exported symbol.

## Module boundary & dependency rules (satisfy these now)
The quality gate's review judges your code against the project's cross-module dependency rules below and BLOCKS the phase on a violation. These govern how modules depend on each other: import another module ONLY through its declared public entry point (its barrel / index) — never reach into another module's internal files — and introduce no circular dependencies. Comply now rather than leaving them for the gate:
- Modules import from each other ONLY through their declared public entry point (`index.ts`, `__init__.py`, package root — whatever the stack uses)
- No circular dependencies between modules

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