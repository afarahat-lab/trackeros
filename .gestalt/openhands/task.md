# Fix specific quality-gate violations: Phase 10: Supporting services — Balance, Notification, Audit, Policy, Employee

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/76d847b2-5905-40af-b702-36710232b1e4/10/3`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make the targeted edits listed below — do NOT refactor, regenerate, or change unrelated code.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- `LeaveRequestService.submit`, `approve`, and `cancel` methods call `IBalanceService.getBalance` (or `ILeaveBalanceRepository.findByEmployeeAndPolicy` directly). After the `getBalance` signature changes to return `null`, these call sites must check for null and throw `BALANCE_NOT_FOUND` themselves — preserving the existing error semantics that callers of `submit`/`approve`/`cancel` already rely on. (see `src/modules/leave-request/leave-request.service.ts`)
- The `markAsRead` implementation must call `updateStatus` with `NotificationStatus.READ` AND set `readAt` to the current timestamp. The `INotificationRepository.updateStatus` signature currently accepts `(id, status)` — the implementation must ensure `readAt` is persisted. If the repository interface needs to accept `readAt`, that change must be consistent with the existing stub and any future DB-backed implementation. (see `src/modules/notification/notification.repository.ts`)
- The `IBalanceService.getBalance` return type must be consistent with `ILeaveBalanceRepository.findByEmployeeAndPolicy` — both return `T | null`. The service method delegates to the repository and must not add throwing semantics that the repository does not have. The `LeaveRequestService` already calls the repository directly (not the service) and already handles null by throwing `BALANCE_NOT_FOUND` — no change needed there. (see `src/modules/leave-balance/leave-balance.repository.ts`)
### Entity invariants — enforce these
- Reuse or extend `LeaveBalance`: Absence of a LeaveBalance for a given (employeeId, leavePolicyId, fiscalYear) tuple is a valid domain state — it is not an error at the service-interface level. The `IBalanceService.getBalance` contract reflects this by returning `null` rather than throwing.
- Reuse or extend `LeaveNotification`: When a LeaveNotification transitions to READ status, `readAt` must be set to the timestamp of the transition. A READ notification without a `readAt` timestamp is an invalid state.
### Interface contract — expose these operations (their shape is yours)
- IBalanceService.getBalance(employeeId, leavePolicyId, fiscalYear) — Returns `LeaveBalance | null`. Does NOT throw. Null means no balance exists for the given tuple — callers decide whether that is an error in their context.
- INotificationService.markAsRead(id) — idempotent; Throws `NOTIFICATION_NOT_FOUND` when the notification does not exist. Idempotent for notifications already in READ or ARCHIVED status — no state change, no error. When transitioning to READ, sets `readAt` to the current timestamp.
- INotificationService.notifyLeaveSubmitted(leaveRequest) — Throws `EMPLOYEE_NOT_FOUND` when employee does not exist. Throws `NO_MANAGER_ASSIGNED` when employee.managerId is null. No silent fallback — both conditions are hard errors.
- INotificationService.notifyLeaveCancelled(leaveRequest) — Throws `EMPLOYEE_NOT_FOUND` when employee does not exist. Throws `NO_MANAGER_ASSIGNED` when employee.managerId is null. No silent fallback.
- INotificationService.notifyLeaveApproved(leaveRequest) — Throws `EMPLOYEE_NOT_FOUND` when employee does not exist. Does NOT check managerId (notification goes to the employee, not the manager).
- INotificationService.notifyLeaveRejected(leaveRequest) — Throws `EMPLOYEE_NOT_FOUND` when employee does not exist. Does NOT check managerId (notification goes to the employee, not the manager).
### Integration points — connect to these
- src/modules/leave-request/leave-request.service.ts → ILeaveBalanceRepository.findByEmployeeAndPolicy — LeaveRequestService already calls the repository directly (not IBalanceService) and already handles null by throwing BALANCE_NOT_FOUND. The IBalanceService.getBalance signature change does not affect LeaveRequestService — no caller update needed there.
- src/modules/notification/notification.repository.ts → INotificationRepository.updateStatus — markAsRead must persist readAt. The current updateStatus signature only accepts (id, status). Either updateStatus must be extended to accept readAt, or a separate mechanism must set readAt. The repository interface is the integration boundary.

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

## Project constraints (NON-NEGOTIABLE — the gate enforces these; satisfy them now)
Your code MUST obey every rule below. These are not style preferences — the quality gate rejects the phase on any violation, so comply up front:
- Use unknown with type guards instead of any (rule: `no-any`)
- Database calls must go through repository pattern (rule: `no-direct-db-outside-repository`)
- No hardcoded passwords, API keys, or tokens (rule: `no-hardcoded-secrets`)
- Do not add @gestalt/* packages as project dependencies — these are Gestalt platform internals not available on npm (rule: `no-gestalt-internal-deps`)

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decision for all questions: (1) Fiscal year = calendar year (Jan 1 to Dec 31), hardcoded — no configurable fiscalYearStart field. (2) Leave duration counts calendar days inclusive — weekends and public holidays ARE counted as leave days; do NOT introduce a holiday calendar entity. (3) Minimum granularity = full-day increments only — leave balances are integers, no half-days, no hours, no time-of-day on startDate/endDate. (4) Day counting from start_date to end_date is calendar days inclusive of both ends: daysRequested = (end_date - start_date) + 1. This single formula is BINDING at every call site (used_days deduction, overlap detection, remaining_days) — no weekend or holiday exclusion anywhere. [BINDING RULE — operator decision resolving: How is the fiscal year boundary defined — calendar year (Jan 1 – Dec 31) or a configurable start month/day? This determines when LeaveBalance transitions from ACTIVE/EXHAUSTED to CLOSED and when new balance records are created.; Should leave duration count weekends and public holidays as leave days, or only business days? The current rule uses calendar days inclusive, but this may not match all organisational policies.; What is the minimum granularity of a leave request — full days, half days, or hours? This affects the daysRequested calculation and balance precision.; How are leave days counted from start_date to end_date — calendar days (inclusive of both ends, e.g. Mon–Fri = 5 days) or business/working days only? This is BINDING across all balance-deduction and overlap-detection call sites.; apply everywhere these apply, not in one place only]

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
Before making the edits below, read the referenced files (those present in the working directory) to learn the project's architecture, conventions, and the cross-cutting rules your fix must still satisfy — then keep the edits consistent with them:
- `HARNESS.json`
- `docs/ARCHITECTURE.md`
- `docs/GOLDEN_PRINCIPLES.md`
- `AGENTS.md`
- `PLAN.md`

## Required edits

### Edit 1
File: src/modules/leave-policy/leave-policy.service.interface.ts
Offending code: `- `src/modules/leave-policy/leave-policy.service.interface.ts` — `ILeavePolicyService` with getPolicy(id), getPolicyByType(leaveType), isActive(id)`
Rule violated: missing-required-file
Action (do this now): Edit `src/modules/leave-policy/leave-policy.service.interface.ts` in place to fix the `missing-required-file` violation.
What the quality gate found — apply this: [missing-required-file] The spec requires this stub interface file to be created, but it does not exist. The leave-policy directory only contains model, repository, and barrel files.

### Edit 2
File: src/modules/employee/employee.service.interface.ts
Offending code: `- `src/modules/employee/employee.service.interface.ts` — `IEmployeeService` with getEmployee(id), getManager(employeeId), isActive(id)`
Rule violated: missing-required-file
Action (do this now): Edit `src/modules/employee/employee.service.interface.ts` in place to fix the `missing-required-file` violation.
What the quality gate found — apply this: [missing-required-file] The spec requires this stub interface file to be created, but it does not exist. The employee directory only contains model, repository, and barrel files.

### Edit 3
File: tests/unit/modules/leave-balance/leave-balance.service.test.ts
Offending code: `- `tests/unit/modules/leave-balance/leave-balance.service.test.ts` and `tests/unit/modules/notification/notification.service.test.ts` — Jest unit tests with mocked repositories.`
Rule violated: missing-required-file
Action (do this now): Edit `tests/unit/modules/leave-balance/leave-balance.service.test.ts` in place to fix the `missing-required-file` violation.
What the quality gate found — apply this: [missing-required-file] The spec requires Jest unit tests for BalanceService, but this file does not exist. The test directory only contains model and repository tests.

### Edit 4
File: tests/unit/modules/notification/notification.service.test.ts
Offending code: `- `tests/unit/modules/leave-balance/leave-balance.service.test.ts` and `tests/unit/modules/notification/notification.service.test.ts` — Jest unit tests with mocked repositories.`
Rule violated: missing-required-file
Action (do this now): Edit `tests/unit/modules/notification/notification.service.test.ts` in place to fix the `missing-required-file` violation.
What the quality gate found — apply this: [missing-required-file] The spec requires Jest unit tests for NotificationService, but this file does not exist. The test directory only contains model and repository tests.

### Coherent change 1 — apply as ONE atomic edit across ALL sites below

Unifying change (do this now): In initializeBalance, after fetching the policy and before creating the balance, call balanceRepo.findByEmployeeAndPolicy(employeeId, leavePolicyId, fiscalYear); if a balance already exists, throw { error: 'Leave balance already exists', code: 'BALANCE_ALREADY_EXISTS' }.

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/modules/leave-balance/leave-balance.service.ts
Line: 40
Offending code: `const policy = await this.policyRepo.findById(leavePolicyId);`
Rule violated: BALANCE_ALREADY_EXISTS
Action (do this now): Edit `src/modules/leave-balance/leave-balance.service.ts` at line 40 in place to fix the `BALANCE_ALREADY_EXISTS` violation.
What the quality gate found — apply this: [BALANCE_ALREADY_EXISTS] The `initializeBalance` method must check for an existing balance for the same `(employeeId, leavePolicyId, fiscalYear)` tuple before creating. If one already exists, it must throw with code `BALANCE_ALREADY_EXISTS`. The current implementation only checks if the policy exists but never calls `balanceRepo.findByEmployeeAndPolicy` to guard against duplicate balances.

- Site 2
File: src/modules/leave-balance/leave-balance.service.ts
Line: 34
Offending code: `const balance = await this.balanceRepo.create({`
Rule violated: review/correctness
Action (do this now): Edit `src/modules/leave-balance/leave-balance.service.ts` at line 34 in place to fix the `review/correctness` violation.
What the quality gate found — apply this: [review/correctness] `initializeBalance` does not check for an existing balance before creating. The spec requires checking via `findByEmployeeAndPolicy` first and throwing `{ error: string, code: 'BALANCE_ALREADY_EXISTS' }` if a balance already exists for the same (employeeId, leavePolicyId, fiscalYear) tuple.

Then check the rest of these files (and the surrounding module) for ANY OTHER occurrence of the same pattern beyond the specific lines listed above, and apply the same change there too — do NOT limit the fix to only the enumerated sites.

### Coherent change 2 — apply as ONE atomic edit across ALL sites below

Unifying change (do this now): Rewrite markAsRead to: (1) fetch the notification by id via the repository, (2) if null, throw { error: 'Notification not found', code: 'NOTIFICATION_NOT_FOUND' }, (3) if already READ, return as a no-op, (4) otherwise update the notification setting both status to READ and readAt to the current timestamp.

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/modules/notification/notification.service.ts
Line: 78
Offending code: `await this.notificationRepo.updateStatus(id, NotificationStatus.READ);`
Rule violated: markAsRead-missing-readAt-and-error
Action (do this now): Edit `src/modules/notification/notification.service.ts` at line 78 in place to fix the `markAsRead-missing-readAt-and-error` violation.
What the quality gate found — apply this: [markAsRead-missing-readAt-and-error] The `markAsRead` method must (1) set `readAt` to the current timestamp and (2) throw a typed error with code `NOTIFICATION_NOT_FOUND` if the notification is not found. The current implementation only calls `updateStatus` which updates the status field but does not set `readAt`, and it ignores the return value (which is `Promise<LeaveNotification | null>`) so it cannot detect a missing notification.

- Site 2
File: src/modules/notification/notification.service.ts
Line: 73
Offending code: `await this.notificationRepo.updateStatus(id, NotificationStatus.READ);`
Rule violated: review/correctness
Action (do this now): Edit `src/modules/notification/notification.service.ts` at line 73 in place to fix the `review/correctness` violation.
What the quality gate found — apply this: [review/correctness] `markAsRead` does not set `readAt` to the current timestamp and does not throw `NOTIFICATION_NOT_FOUND` when the notification doesn't exist. The spec requires: (1) setting `readAt` to the current timestamp, (2) throwing `{ error: string, code: 'NOTIFICATION_NOT_FOUND' }` when the id does not resolve, and (3) idempotency — calling on an already-READ notification is a no-op.

Then check the rest of these files (and the surrounding module) for ANY OTHER occurrence of the same pattern beyond the specific lines listed above, and apply the same change there too — do NOT limit the fix to only the enumerated sites.

### Coherent change 3 — apply as ONE atomic edit across ALL sites below

Unifying change (do this now): Change getBalance to return Promise<LeaveBalance | null> in both the interface and implementation: when no balance is found via balanceRepo.findByEmployeeAndPolicy, return null instead of throwing BALANCE_NOT_FOUND.

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/modules/leave-balance/leave-balance.service.interface.ts
Line: 4
Offending code: `getBalance(employeeId: string, leavePolicyId: string, fiscalYear: number): Promise<LeaveBalance>;`
Rule violated: getBalance-return-type-mismatch
Action (do this now): Edit `src/modules/leave-balance/leave-balance.service.interface.ts` at line 4 in place to fix the `getBalance-return-type-mismatch` violation.
What the quality gate found — apply this: [getBalance-return-type-mismatch] The interface declares `getBalance` as returning `Promise<LeaveBalance>` (non-nullable), but the spec success criteria states: "If no balance exists, it returns `null`." The return type should be `Promise<LeaveBalance | null>`. The implementation also throws `BALANCE_NOT_FOUND` instead of returning null, contradicting the spec.

- Site 2
File: src/modules/leave-balance/leave-balance.service.ts
Line: 24
Offending code: `throw { error: 'Leave balance not found', code: 'BALANCE_NOT_FOUND' };`
Rule violated: review/correctness
Action (do this now): Edit `src/modules/leave-balance/leave-balance.service.ts` at line 24 in place to fix the `review/correctness` violation.
What the quality gate found — apply this: [review/correctness] `getBalance` throws an error when no balance exists, but the phase spec success criterion explicitly states: "If no balance exists, it returns `null`." The method must return `null` instead of throwing. The interface signature should also be `Promise<LeaveBalance | null>` to accommodate this.

- Site 3
File: src/modules/leave-balance/leave-balance.service.interface.ts
Line: 4
Offending code: `getBalance(employeeId: string, leavePolicyId: string, fiscalYear: number): Promise<LeaveBalance>;`
Rule violated: review/correctness
Action (do this now): Edit `src/modules/leave-balance/leave-balance.service.interface.ts` at line 4 in place to fix the `review/correctness` violation.
What the quality gate found — apply this: [review/correctness] The `getBalance` return type is `Promise<LeaveBalance>` (non-nullable), but the spec requires `Promise<LeaveBalance | null>` — the method must return `null` when no balance exists rather than throwing.

Then check the rest of these files (and the surrounding module) for ANY OTHER occurrence of the same pattern beyond the specific lines listed above, and apply the same change there too — do NOT limit the fix to only the enumerated sites.

### Edit 5
File: src/modules/leave-balance/index.ts
Offending code: `export { ILeaveBalanceRepository, LeaveBalanceRepository } from './leave-balance.repository';`
Rule violated: barrel-export-missing
Action (do this now): Edit `src/modules/leave-balance/index.ts` in place to fix the `barrel-export-missing` violation.
What the quality gate found — apply this: [barrel-export-missing] The barrel export does not re-export `BalanceService` or `IBalanceService`. The spec constraint states: "All new service and interface files must be re-exported from their module's `index.ts` barrel file so they are importable by other modules via the module's public entry point." The same issue exists for notification and audit modules.

### Edit 6
File: src/modules/notification/index.ts
Offending code: `export { INotificationRepository, NotificationRepository } from './notification.repository';`
Rule violated: barrel-export-missing
Action (do this now): Edit `src/modules/notification/index.ts` in place to fix the `barrel-export-missing` violation.
What the quality gate found — apply this: [barrel-export-missing] The barrel export does not re-export `NotificationService` or `INotificationService`. The spec constraint requires all new service and interface files to be re-exported from their module's `index.ts` barrel file.

### Edit 7
File: src/modules/audit/index.ts
Offending code: `export { IAuditLogRepository, AuditLogRepository } from './audit.repository';`
Rule violated: barrel-export-missing
Action (do this now): Edit `src/modules/audit/index.ts` in place to fix the `barrel-export-missing` violation.
What the quality gate found — apply this: [barrel-export-missing] The barrel export does not re-export `IAuditService`. The spec constraint requires all new service and interface files to be re-exported from their module's `index.ts` barrel file.

### Coherent change 4 — apply as ONE atomic edit across ALL sites below

Unifying change (do this now): In all notify* methods (notifyLeaveSubmitted, notifyLeaveApproved, notifyLeaveRejected, notifyLeaveCancelled), after fetching the employee via employeeRepo.findById, throw { error: 'Employee not found', code: 'EMPLOYEE_NOT_FOUND' } if the employee is null, and throw { error: 'No manager assigned', code: 'NO_MANAGER_ASSIGNED' } if the employee's managerId is null (for SUBMITTED/CANCELLED which target the manager). Remove the silent fallback `employee?.managerId ?? leaveRequest.employeeId`.

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/modules/notification/notification.service.ts
Line: 18
Offending code: `const employee = await this.employeeRepo.findById(leaveRequest.employeeId);`
Rule violated: review/correctness
Action (do this now): Edit `src/modules/notification/notification.service.ts` at line 18 in place to fix the `review/correctness` violation.
What the quality gate found — apply this: [review/correctness] `notifyLeaveSubmitted` does not throw when the employee is not found or when the employee has no manager. The spec requires throwing `{ error: string, code: 'EMPLOYEE_NOT_FOUND' }` when the employeeId does not resolve, and `{ error: string, code: 'NO_MANAGER_ASSIGNED' }` when `managerId` is null. The current code silently falls back to `leaveRequest.employeeId` via `employee?.managerId ?? leaveRequest.employeeId`.

- Site 2
File: src/modules/notification/notification.service.ts
Line: 18
Offending code: `const employee = await this.employeeRepo.findById(leaveRequest.employeeId);`
Rule violated: review/correctness
Action (do this now): Edit `src/modules/notification/notification.service.ts` at line 18 in place to fix the `review/correctness` violation.
What the quality gate found — apply this: [review/correctness] `notifyLeaveSubmitted` does not throw when the employee is not found. The spec interface constraint requires throwing `{ error: string, code: 'EMPLOYEE_NOT_FOUND' }` when the leaveRequest's employeeId does not resolve. The current code silently falls back to `leaveRequest.employeeId` via `employee?.managerId ?? leaveRequest.employeeId`.

- Site 3
File: src/modules/notification/notification.service.ts
Line: 57
Offending code: `const employee = await this.employeeRepo.findById(leaveRequest.employeeId);`
Rule violated: review/correctness
Action (do this now): Edit `src/modules/notification/notification.service.ts` at line 57 in place to fix the `review/correctness` violation.
What the quality gate found — apply this: [review/correctness] `notifyLeaveCancelled` does not throw when the employee is not found. The spec interface constraint requires throwing `{ error: string, code: 'EMPLOYEE_NOT_FOUND' }` when the leaveRequest's employeeId does not resolve. The current code silently falls back to `leaveRequest.employeeId` via `employee?.managerId ?? leaveRequest.employeeId`.

Then check the rest of these files (and the surrounding module) for ANY OTHER occurrence of the same pattern beyond the specific lines listed above, and apply the same change there too — do NOT limit the fix to only the enumerated sites.

### Edit 8
File: src/modules/leave-policy/leave-policy.service.interface.ts
Offending code: `src/modules/leave-policy/leave-policy.service.interface.ts`
Rule violated: review/completeness
Action (do this now): Edit `src/modules/leave-policy/leave-policy.service.interface.ts` in place to fix the `review/completeness` violation.
What the quality gate found — apply this: [review/completeness] Missing stub interface file. The phase spec success criterion 8 requires `src/modules/leave-policy/leave-policy.service.interface.ts` exporting `ILeavePolicyService` with `getPolicy(id)`, `getPolicyByType(leaveType)`, `isActive(id)`. This file does not exist.

### Edit 9
File: src/modules/employee/employee.service.interface.ts
Offending code: `src/modules/employee/employee.service.interface.ts`
Rule violated: review/completeness
Action (do this now): Edit `src/modules/employee/employee.service.interface.ts` in place to fix the `review/completeness` violation.
What the quality gate found — apply this: [review/completeness] Missing stub interface file. The phase spec success criterion 8 requires `src/modules/employee/employee.service.interface.ts` exporting `IEmployeeService` with `getEmployee(id)`, `getManager(employeeId)`, `isActive(id)`. This file does not exist.

### Edit 10
File: src/modules/leave-balance/index.ts
Offending code: `export { ILeaveBalanceRepository, LeaveBalanceRepository } from './leave-balance.repository';`
Rule violated: review/completeness
Action (do this now): Edit `src/modules/leave-balance/index.ts` in place to fix the `review/completeness` violation.
What the quality gate found — apply this: [review/completeness] The leave-balance barrel export does not re-export `IBalanceService` and `BalanceService`. The spec integration point requires these to be exported so other modules can import them via the public barrel.

### Edit 11
File: src/modules/notification/index.ts
Offending code: `export { INotificationRepository, NotificationRepository } from './notification.repository';`
Rule violated: review/completeness
Action (do this now): Edit `src/modules/notification/index.ts` in place to fix the `review/completeness` violation.
What the quality gate found — apply this: [review/completeness] The notification barrel export does not re-export `INotificationService` and `NotificationService`. The spec integration point requires these to be exported so other modules can import them via the public barrel.

### Edit 12
File: tests/unit/modules/leave-balance/leave-balance.service.test.ts
Offending code: `tests/unit/modules/leave-balance/leave-balance.service.test.ts`
Rule violated: review/completeness
Action (do this now): Edit `tests/unit/modules/leave-balance/leave-balance.service.test.ts` in place to fix the `review/completeness` violation.
What the quality gate found — apply this: [review/completeness] Missing test file. The phase spec success criterion 9 requires Jest unit tests at `tests/unit/modules/leave-balance/leave-balance.service.test.ts` covering `initializeBalance`, `getBalance`, `getBalancesForEmployee`, and error cases. This file does not exist.

### Edit 13
File: tests/unit/modules/notification/notification.service.test.ts
Offending code: `tests/unit/modules/notification/notification.service.test.ts`
Rule violated: review/completeness
Action (do this now): Edit `tests/unit/modules/notification/notification.service.test.ts` in place to fix the `review/completeness` violation.
What the quality gate found — apply this: [review/completeness] Missing test file. The phase spec success criterion 9 requires Jest unit tests at `tests/unit/modules/notification/notification.service.test.ts` covering all `notify*` methods, `getNotificationsForUser`, `markAsRead`, and error cases. This file does not exist.

## Verify before you finish (MANDATORY)
After making the edits above, the code MUST still compile and its tests MUST pass — a compilation/type error, or a test your change breaks, must NEVER be left for CI or the quality gate to find. Before you declare this task done:
- Read the project's build / type-check / test commands from `package.json` (scripts) and `HARNESS.json`, install dependencies if they are not already installed, then RUN the type-check / build (e.g. `npm run build` or `tsc --noEmit`) AND the tests (e.g. `npm test`).
- FIX every compilation error, type error, and failing test that YOUR edits introduced — including updating a test whose expectation your change legitimately invalidated (e.g. a new required field, a new status code such as 401/403 from an added authorization check, added input validation) — and re-run until they pass.
- Only when the build and the tests pass may you consider the task complete. If a dependency install genuinely cannot be made to work, say so explicitly in your final message rather than declaring success on unverified code.

## Constraints (mandatory)
- Keep the change SURGICAL: make the required edits above and fix only what they broke (compile/type errors and the tests they invalidated). Do NOT refactor, regenerate, or change unrelated code, and do not add / delete / rename source files beyond what a required edit — or a test-fix for it — needs.
- Do NOT run `git commit`, `git push`, `git add`, or any git command. The platform handles all git operations. (Running the build / type-check / tests above is expected and encouraged — that is NOT a git operation.)
- When the listed edits are made and the build + tests pass, stop.