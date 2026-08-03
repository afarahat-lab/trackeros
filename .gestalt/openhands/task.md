# Implement this phase: Phase 9: Leave service — core business logic

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/c8e3d826-436d-4da1-aaf8-6a4bd895c61c/10`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Implement the LeaveRequestService with all binding business rules. This phase depends on every prior phase — read these files before generating:

- src/shared/types/enums.ts (Phase 1)
- src/shared/types/leave-request.dto.ts (Phase 1)
- src/shared/utils/day-count.ts (Phase 1)
- src/modules/employee/employee.model.ts and employee.repository.ts (Phase 2)
- src/modules/policy/policy.model.ts and policy.repository.ts (Phase 3)
- src/modules/balance/balance.model.ts and balance.repository.ts (Phase 4)
- src/modules/leave/leave.model.ts and leave.repository.ts (Phase 5)
- src/shared/holidays/holiday.model.ts and holiday.repository.ts (Phase 6)
- src/modules/notification/notification.service.interface.ts (Phase 7)
- src/modules/audit/audit.model.ts and audit.repository.ts (Phase 8)

Files to create (3 source files):

1. **src/modules/leave/leave.service.interface.ts** — Define `ILeaveRequestService` interface:
   - submitDraft(leaveRequestId: string, actorId: string): Promise<LeaveRequest>
   - approve(leaveRequestId: string, approverId: string): Promise<LeaveRequest>
   - reject(leaveRequestId: string, rejectorId: string, reason: string): Promise<LeaveRequest>
   - cancel(leaveRequestId: string, actorId: string): Promise<LeaveRequest>
   - createDraft(dto: CreateLeaveRequestDto): Promise<LeaveRequest>
   - findById(id: string): Promise<LeaveRequest | null>
   - findByEmployee(employeeId: string): Promise<LeaveRequest[]>

2. **src/modules/leave/leave.service.ts** — Implement `LeaveRequestService` implementing ILeaveRequestService. Constructor takes: ILeaveRequestRepository, IEmployeeRepository, ILeavePolicyRepository, ILeaveBalanceRepository, IHolidayRepository, INotificationService, IAuditLogRepository.

   Binding rules to implement:
   - **submitDraft**: Validate employee exists. Look up active LeavePolicy by leavePolicyId. Compute fiscalYear = calendar year of startDate. Fetch holidays in range, call countBusinessDays. Fetch LeaveBalance for employee+policy+fiscalYear; if none exists, fail. Atomically check remainingDays (totalEntitlement - usedDays) >= requested business days; if not, fail. Increment usedDays by business day count in same transaction. Transition status DRAFT→SUBMITTED. Write audit log. Send notification.
   - **approve**: Validate request is SUBMITTED. If employee has no manager (managerId is null), only HR admin role may approve (check actor role from caller). Transition SUBMITTED→APPROVED, set approvedBy/approvedAt. Do NOT change usedDays again. Write audit log. Send notification.
   - **reject**: Validate request is SUBMITTED. Transition SUBMITTED→REJECTED, set rejectedBy/rejectedAt/rejectionReason. Restore usedDays (decrement by business day count). Write audit log. Send notification.
   - **cancel**: Validate request is SUBMITTED or APPROVED. Transition to CANCELLED, set cancelledBy/cancelledAt. If was SUBMITTED or APPROVED, restore usedDays. Write audit log. Send notification.
   - **createDraft**: Create a LeaveRequest with status DRAFT. No balance check.
   - Fiscal/leave year = calendar year. Day counting = business days only via countBusinessDays. usedDays is denormalized counter, deducted on submit, restored on reject/cancel. remainingDays is computed, never stored.

3. **src/modules/leave/index.ts** — Update barrel to also export ILeaveRequestService and LeaveRequestService.

Include Jest unit tests in **tests/unit/modules/leave/leave.service.test.ts** covering: submit with sufficient balance, submit with insufficient balance (fails), approve by manager, approve by HR admin for employee with no manager, reject restores balance, cancel restores balance, business-day counting integration, fiscal year derivation.

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
- The service must call countBusinessDays from the shared day-count utility — the single shared function used by all call sites — not a reimplementation. The function signature is countBusinessDays(startDate: Date, endDate: Date, holidays: Date[]): number. (see `src/shared/utils/day-count.ts`)
- The service must use ILeaveBalanceRepository.findByEmployeeAndPolicy(employeeId, leavePolicyId, fiscalYear) for balance lookup and ILeaveBalanceRepository.updateUsedDays(id, usedDays) as the sole balance mutation point. The returned balance includes a computed remainingDays field (LeaveBalanceWithRemaining). The service must not compute remainingDays independently — it must read it from the repository result. (see `src/modules/balance/balance.repository.ts`)
- The service must use IHolidayRepository.findByDateRange(startDate, endDate) to fetch holidays, then map the results to a Date[] array (holidays.map(h => h.date)) before passing to countBusinessDays. The Holiday interface has a date: Date field. (see `src/shared/holidays/holiday.repository.ts`)
- The service must use INotificationService.notifyLeaveSubmitted(employeeId, leaveRequestId) after submitDraft and INotificationService.notifyLeaveStatusChange(employeeId, leaveRequestId, oldStatus, newStatus) after approve/reject/cancel. The method signatures and parameter order must match exactly. (see `src/modules/notification/notification.service.interface.ts`)
- The service must use IAuditLogRepository.create(entry) where entry is Omit<AuditLog, 'id'|'createdAt'|'updatedAt'> with fields actorId, action, targetId, targetType, details (Record<string, unknown> | null), timestamp (Date). The AuditLog model defines these exact fields. (see `src/modules/audit/audit.repository.ts`)
- The service must use ILeaveRequestRepository.findById, findByEmployeeId, create, and update for all leave request persistence. The create method takes Omit<LeaveRequest, 'id'|'createdAt'|'updatedAt'> and update takes Partial<LeaveRequest>. The service must not bypass the repository to query leave_requests directly. (see `src/modules/leave/leave.repository.ts`)
- The service must use IEmployeeRepository.findById to resolve the employee and read managerId for approver authorization. The Employee interface defines managerId as string | null. The service must not add a role field to Employee or read auth state from the employee record. (see `src/modules/employee/employee.repository.ts`)
- The service must use ILeavePolicyRepository.findById to look up the policy by leavePolicyId and check isActive. The LeavePolicy interface defines isActive as boolean. The service must reject with a typed error if the policy is not found or is inactive. (see `src/modules/policy/policy.repository.ts`)
- The ActorRole type must be defined as 'employee' | 'manager' | 'hr_admin' in the service interface file and used as the type for the approverRole/rejectorRole parameters. The LeaveRequestStatus enum values (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED) must be imported from the shared enums file and used for status comparisons and transitions. (see `src/shared/types/enums.ts`)
### Entity invariants — enforce these
- Reuse or extend `LeaveRequest`: Lifecycle transitions are restricted: DRAFT→SUBMITTED (submitDraft), SUBMITTED→APPROVED (approve), SUBMITTED→REJECTED (reject), SUBMITTED|APPROVED→CANCELLED (cancel). Any other source status for a given operation must throw a typed InvalidStatusTransitionError. APPROVED, REJECTED, and CANCELLED are terminal — no operation may transition out of them.
- Reuse or extend `LeaveBalance`: usedDays is a denormalized counter and the sole mutable balance field. It is incremented by the business-day count on submitDraft and decremented (clamped to ≥0) on reject and cancel. approve must not change usedDays. remainingDays is always derived (totalEntitlement - usedDays) and is never persisted or directly written.
- Reuse or extend `LeaveRequest`: On approve, the request's approvedBy is set to the approverId and approvedAt is set to the current timestamp. On reject, rejectedBy, rejectedAt, and rejectionReason are set. On cancel, cancelledBy and cancelledAt are set. These audit-trail fields are null in all other states and are never overwritten once set (terminal states).
- Reuse or extend `AuditLog`: Every state-changing leave operation writes exactly one audit record with action ∈ {LEAVE_DRAFT_CREATED, LEAVE_SUBMITTED, LEAVE_APPROVED, LEAVE_REJECTED, LEAVE_CANCELLED}, targetType 'LeaveRequest', targetId set to the leave request id, actorId set to the acting user, and timestamp set to the current time. Audit records are immutable — no update path exists.
### Interface contract — expose these operations (their shape is yours)
- submitDraft(leaveRequestId, actorId) — No role parameter — identity-based. The actorId is the submitting employee. The request must belong to that employee (enforced at controller layer; service validates employee existence and request status).; Throws typed errors: LeaveRequestNotFoundError if the request does not exist, InvalidStatusTransitionError if status is not DRAFT, EmployeeNotFoundError if the employee does not exist, PolicyNotFoundError if the policy does not exist, PolicyInactiveError if the policy is not active, BalanceNotFoundError if no balance row exists for the composite key, InsufficientBalanceError if remainingDays < businessDays.
- approve(leaveRequestId, approverId, approverRole) — approverRole ∈ 'employee'|'manager'|'hr_admin'. 'employee' is always rejected. 'hr_admin' is always allowed. 'manager' is allowed only if employee.managerId is non-null and approverId === employee.managerId; otherwise throws ApproverNotAuthorizedError.; Throws LeaveRequestNotFoundError, InvalidStatusTransitionError (if not SUBMITTED), EmployeeNotFoundError, ApproverNotAuthorizedError. Does NOT modify usedDays.
- reject(leaveRequestId, rejectorId, rejectorRole, reason) — Same authorization rule as approve: rejectorRole ∈ 'employee'|'manager'|'hr_admin', with 'employee' always rejected, 'hr_admin' always allowed, 'manager' allowed only if rejectorId === employee.managerId.; Throws LeaveRequestNotFoundError, InvalidStatusTransitionError (if not SUBMITTED), InvalidRejectionReasonError (if reason is empty/whitespace), EmployeeNotFoundError, ApproverNotAuthorizedError. Restores usedDays (decrement by business days, clamped ≥0) only if a balance row exists.
- cancel(leaveRequestId, actorId) — No role parameter — identity-based. The request must be in SUBMITTED or APPROVED status. Full RBAC (who may cancel whose request) is enforced at the controller layer.; Throws LeaveRequestNotFoundError, InvalidStatusTransitionError (if status is not SUBMITTED or APPROVED). Restores usedDays (decrement by business days, clamped ≥0) only if a balance row exists.
- createDraft(dto: CreateLeaveRequestDto) — No role parameter. Creates a DRAFT request with no balance check, no day-count computation, and no policy validation. RBAC and input validation are enforced at the controller layer.; Delegates to ILeaveRequestRepository.create; propagates repository errors. Writes an audit record (LEAVE_DRAFT_CREATED).
- findById(id) / findByEmployee(employeeId) — Read-only delegation to ILeaveRequestRepository. No service-layer authorization — RBAC is enforced at the controller layer.; idempotent; Propagates repository errors. findById returns LeaveRequest | null; findByEmployee returns LeaveRequest[].
### Integration points — connect to these
- ILeaveBalanceRepository (balance module) — The leave service reads balance via findByEmployeeAndPolicy to check sufficiency and mutates usedDays via updateUsedDays for deduction (submit) and restoration (reject/cancel). This is the core balance-leave coupling.
- IHolidayRepository (shared/holidays) — The leave service fetches public holidays in the request's date range to exclude them from the business-day count via countBusinessDays.
- INotificationService (notification module) — The leave service fires notifications on every lifecycle event: notifyLeaveSubmitted on submit, notifyLeaveStatusChange on approve/reject/cancel. Notifications are best-effort side effects outside the transactional boundary.

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