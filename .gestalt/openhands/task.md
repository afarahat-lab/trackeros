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
- The service must call countBusinessDays(startDate, endDate, holidayDates) from the shared day-count utility for all day-count computations (submit sufficiency check, submit deduction, reject restoration, cancel restoration) — never re-implement day counting inline. Holidays are fetched from IHolidayRepository.findByDateRange and mapped to their .date array before passing. (see `src/shared/utils/day-count.ts`)
- Balance mutation must go exclusively through ILeaveBalanceRepository.updateUsedDays(id, usedDays) — the single atomic mutation point. The service computes the new usedDays value (increment on submit, clamped decrement on reject/cancel) and passes it; it must not call create or any other balance mutation. Balance reads use findByEmployeeAndPolicy(employeeId, leavePolicyId, fiscalYear) which returns LeaveBalanceWithRemaining with the computed remainingDays. (see `src/modules/balance/balance.repository.ts`)
- Audit records must be created via IAuditLogRepository.create with the Omit<AuditLog, 'id'|'createdAt'|'updatedAt'> shape — actorId, action, targetId, targetType, details (Record<string, unknown> | null), timestamp. The service must not bypass the repository to write audit logs. (see `src/modules/audit/audit.repository.ts`)
- Notifications must be dispatched through INotificationService.notifyLeaveSubmitted (for submitDraft) and INotificationService.notifyLeaveStatusChange(employeeId, leaveRequestId, oldStatus, newStatus) (for approve/reject/cancel) — the service must not construct Notification entities directly or call INotificationRepository. (see `src/modules/notification/notification.service.interface.ts`)
- Status transitions must use the LeaveRequestStatus enum values (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED) from the shared enums file — never string literals — for both the source-status validation and the target-status assignment. (see `src/shared/types/enums.ts`)
- createDraft must accept CreateLeaveRequestDto (employeeId, leavePolicyId, startDate, endDate, reason?) from the shared DTO and map it to a LeaveRequest with status DRAFT and all lifecycle fields initialized to null. (see `src/shared/types/leave-request.dto.ts`)
- The leave module barrel must re-export ILeaveRequestService, ActorRole, LeaveRequestService, and all 9 error classes so downstream consumers (the controller in Phase 11) import only through the public barrel, per the module dependency rule. (see `src/modules/leave/index.ts`)
### Entity invariants — enforce these
- Reuse or extend `LeaveRequest`: Lifecycle transitions are restricted: DRAFT→SUBMITTED (submitDraft), SUBMITTED→APPROVED (approve), SUBMITTED→REJECTED (reject), SUBMITTED|APPROVED→CANCELLED (cancel). Any other source status for a given operation throws InvalidStatusTransitionError. APPROVED, REJECTED, and CANCELLED are terminal — no operation transitions out of them except CANCELLED-from-APPROVED.
- Reuse or extend `LeaveRequest`: On approve, approvedBy and approvedAt are set to the approver's id and the current timestamp; on reject, rejectedBy, rejectedAt, and rejectionReason are set; on cancel, cancelledBy and cancelledAt are set. These fields are null on a DRAFT and remain null for transitions that don't set them.
- Reuse or extend `LeaveBalance`: usedDays is the source of truth and is mutated only through updateUsedDays: incremented by the business-day count on submitDraft, decremented (clamped to ≥0) on reject and cancel. approve never mutates usedDays. remainingDays = totalEntitlement - usedDays is derived at query time and never persisted.
- Reuse or extend `LeaveBalance`: A balance restoration (reject/cancel) that would drive usedDays below 0 is clamped to 0 via Math.max(0, usedDays - businessDays); if no balance row exists for the employee+policy+fiscalYear composite, the restoration is skipped but the status transition and audit still proceed.
- Reuse or extend `Employee`: managerId (string | null) drives approver authorization: when null, only hr_admin may approve/reject; when non-null, only a manager whose actorId equals managerId (or hr_admin) may approve/reject. The employee role is never authorized to approve or reject. No role field is added to Employee.
- Reuse or extend `AuditLog`: Every state-changing leave operation writes exactly one audit record with targetType 'LeaveRequest', the leaveRequestId as targetId, the actor's id as actorId, a timestamp, and an action label matching the operation (LEAVE_SUBMITTED, LEAVE_APPROVED, LEAVE_REJECTED, LEAVE_CANCELLED, LEAVE_DRAFT_CREATED). Audit entries are immutable — no update path exists.
### Interface contract — expose these operations (their shape is yours)
- submitDraft(leaveRequestId, actorId) — Throws LeaveRequestNotFoundError if the request does not exist; InvalidStatusTransitionError if status is not DRAFT; EmployeeNotFoundError if the employee does not exist; PolicyNotFoundError if the policy does not exist; PolicyInactiveError if the policy isActive is false; BalanceNotFoundError if no balance row exists for the employee+policy+fiscalYear composite; InsufficientBalanceError if remainingDays < business days. On success, usedDays is incremented and status transitions to SUBMITTED before the audit and notification fire.
- approve(leaveRequestId, approverId, approverRole) — approverRole must be 'manager' (matching employee.managerId) or 'hr_admin'. 'employee' role always throws ApproverNotAuthorizedError. When employee.managerId is null, only 'hr_admin' is allowed; a 'manager' role throws.; Throws LeaveRequestNotFoundError, InvalidStatusTransitionError (if not SUBMITTED), EmployeeNotFoundError, or ApproverNotAuthorizedError. Does NOT mutate usedDays. Sets approvedBy/approvedAt, writes LEAVE_APPROVED audit, fires notifyLeaveStatusChange(SUBMITTED→APPROVED).
- reject(leaveRequestId, rejectorId, rejectorRole, reason) — Same authorization rules as approve — rejectorRole must be 'manager' (matching employee.managerId) or 'hr_admin'; 'employee' always throws.; Throws InvalidRejectionReasonError if reason is blank/whitespace before any state change. Throws LeaveRequestNotFoundError, InvalidStatusTransitionError (if not SUBMITTED), EmployeeNotFoundError, ApproverNotAuthorizedError. Restores usedDays (clamped ≥0, skipped if no balance row), sets rejectedBy/rejectedAt/rejectionReason, writes LEAVE_REJECTED audit, fires notifyLeaveStatusChange(SUBMITTED→REJECTED).
- cancel(leaveRequestId, actorId) — Throws LeaveRequestNotFoundError or InvalidStatusTransitionError if status is not SUBMITTED or APPROVED. Restores usedDays (clamped ≥0, skipped if no balance row), sets cancelledBy/cancelledAt, writes LEAVE_CANCELLED audit, fires notifyLeaveStatusChange(oldStatus→CANCELLED). No role-based authorization at the service layer — the controller enforces ownership/oversight.
- createDraft(dto) — Creates a LeaveRequest with status DRAFT via the repository; no balance check, no policy validation, no day-count computation. Writes LEAVE_DRAFT_CREATED audit with actorId = dto.employeeId. Propagates repository errors.
- findById(id) — Read-only delegation to the leave request repository; returns LeaveRequest or null. No authorization at the service layer.
- findByEmployee(employeeId) — Read-only delegation to the leave request repository; returns LeaveRequest[] (possibly empty). No authorization at the service layer.
### Integration points — connect to these
- src/modules/employee (IEmployeeRepository) — The service resolves the requesting employee to validate existence and read managerId for approver authorization. Uses findById.
- src/modules/policy (ILeavePolicyRepository) — The service looks up the LeavePolicy by leavePolicyId to validate existence and isActive before allowing submission. Uses findById.
- src/modules/balance (ILeaveBalanceRepository) — The service reads LeaveBalanceWithRemaining for the sufficiency check and mutates usedDays via updateUsedDays for deduction (submit) and restoration (reject/cancel). Uses findByEmployeeAndPolicy and updateUsedDays.
- src/shared/holidays (IHolidayRepository) — The service fetches public holidays in the request's date range to pass to countBusinessDays for accurate business-day exclusion. Uses findByDateRange.
- src/modules/notification (INotificationService) — The service fires best-effort notifications on every state transition (submitDraft → notifyLeaveSubmitted; approve/reject/cancel → notifyLeaveStatusChange). Notification failures must not abort the workflow.
- src/modules/audit (IAuditLogRepository) — The service writes an audit record for every state-changing operation (GP-002), satisfying the golden principle that all state changes produce an audit trail. Uses create.
- src/shared/utils/day-count.ts (countBusinessDays) — The single shared day-count function used by all call sites (sufficiency check, deduction, restoration) to ensure identical business-day computation everywhere.
- src/modules/leave/leave.repository.ts (ILeaveRequestRepository) — The service persists and updates LeaveRequest entities (create for createDraft, update for status transitions) and reads them (findById, findByEmployeeId).

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