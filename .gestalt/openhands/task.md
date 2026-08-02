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
- The service must call countBusinessDays(startDate, endDate, holidays) with the exact signature exported from src/shared/utils/day-count.ts — (startDate: Date, endDate: Date, holidays: Date[]) => number — passing the request's startDate/endDate and the holidays array fetched from IHolidayRepository.findByDateRange; the holiday Date objects must be compatible with countBusinessDays' local-time isSameDay comparison (the holiday repository already normalizes to local dates). (see `src/shared/utils/day-count.ts`)
- The service must use ILeaveBalanceRepository.findByEmployeeAndPolicy(employeeId, leavePolicyId, fiscalYear) to fetch the balance (returns LeaveBalanceWithRemaining | null, where remainingDays is pre-computed) and ILeaveBalanceRepository.updateUsedDays(id, usedDays) as the sole mutation point (takes the balance id and the new absolute usedDays value, returns LeaveBalanceWithRemaining | null); the service must not call create or findByEmployeeId for the submit/reject/cancel flows. (see `src/modules/balance/balance.repository.ts`)
- The service must use ILeaveRequestRepository.update(id, Partial<LeaveRequest>) for status transitions and metadata fields (approvedBy/approvedAt, rejectedBy/rejectedAt/rejectionReason, cancelledBy/cancelledAt), and ILeaveRequestRepository.create for createDraft; the update method does a read-then-write merge so the service should pass only the fields it intends to change (status + the relevant transition metadata), not the full entity. (see `src/modules/leave/leave.repository.ts`)
- The service must call IAuditLogRepository.create with an object matching Omit<AuditLog, 'id' | 'createdAt' | 'updatedAt'> — i.e., { actorId, action, targetId, targetType, details, timestamp } — where details is Record<string, unknown> | null and timestamp is a Date; the action strings must be exactly LEAVE_DRAFT_CREATED, LEAVE_SUBMITTED, LEAVE_APPROVED, LEAVE_REJECTED, LEAVE_CANCELLED and targetType must be 'LeaveRequest'. (see `src/modules/audit/audit.repository.ts`)
- The service must call INotificationService.notifyLeaveSubmitted(employeeId, leaveRequestId) for the submit flow and INotificationService.notifyLeaveStatusChange(employeeId, leaveRequestId, oldStatus, newStatus) for approve/reject/cancel flows, matching the exact parameter order and types from the interface; oldStatus/newStatus are passed as strings (the LeaveRequestStatus enum values stringify correctly). (see `src/modules/notification/notification.service.interface.ts`)
- The service must use IEmployeeRepository.findById(id) to resolve the requesting employee (returns Employee | null) and read employee.managerId (string | null) for the approve/reject authorization check; the service must not use findByManagerId or other employee repository methods for authorization — the check is approverId === employee.managerId, not a reverse lookup. (see `src/modules/employee/employee.repository.ts`)
- The service must use ILeavePolicyRepository.findById(leavePolicyId) to look up the policy referenced by the leave request and verify policy.isActive is true before proceeding with the submit flow; the service must not use findByLeaveType or findActive for this lookup since the request already carries a specific leavePolicyId. (see `src/modules/policy/policy.repository.ts`)
- The updated barrel must follow the established project pattern: `export type` for interfaces and type aliases (ILeaveRequestService, ActorRole) and `export` for classes (LeaveRequestService) and error classes, preserving the existing `export type { LeaveRequest }`, `export type { ILeaveRequestRepository }`, and `export { PgLeaveRequestRepository }` lines. (see `src/modules/leave/index.ts`)
### Entity invariants — enforce these
- Reuse or extend `LeaveRequest`: The status field follows a strict state machine: DRAFT→SUBMITTED (via submitDraft), SUBMITTED→APPROVED (via approve), SUBMITTED→REJECTED (via reject), SUBMITTED|APPROVED→CANCELLED (via cancel); APPROVED, REJECTED, and CANCELLED are terminal — no method may transition out of them; any attempt to apply a transition from an invalid source status must fail with a typed error before any side effect (balance mutation, audit, notification) is performed.
- Reuse or extend `LeaveBalance`: usedDays is a monotonically adjusted denormalized counter that is incremented exactly once when a request is submitted (DRAFT→SUBMITTED) and decremented exactly once when that same request is rejected or cancelled; approve never touches usedDays; the increment and decrement amounts are always equal to the business-day count computed at submission time, so a full submit→reject or submit→cancel cycle returns usedDays to its pre-submission value.
- Reuse or extend `LeaveBalance`: remainingDays is a computed value (totalEntitlement − usedDays) obtained from the repository's LeaveBalanceWithRemaining return type; the service must never persist or write remainingDays — it reads it for the sufficiency check and computes new usedDays values, but the only mutation path is updateUsedDays which writes usedDays exclusively.
- Reuse or extend `Employee`: The managerId field (string | null) is the sole determinant of who may approve/reject a request: when managerId is null, only an actor with role 'hr_admin' may approve; when managerId is non-null, only an actor whose id equals managerId and whose role is 'manager' (or any 'hr_admin') may approve; an actor with role 'employee' may never approve or reject regardless of managerId.
- Reuse or extend `AuditLog`: Each state-changing service operation produces exactly one immutable audit log entry with a distinct action string (LEAVE_DRAFT_CREATED, LEAVE_SUBMITTED, LEAVE_APPROVED, LEAVE_REJECTED, LEAVE_CANCELLED), targetType 'LeaveRequest', and targetId equal to the affected LeaveRequest id; the entry is written via IAuditLogRepository.create and is never updated or deleted by the service.
### Interface contract — expose these operations (their shape is yours)
- submitDraft(leaveRequestId, actorId) — No role parameter — identity-based; the actorId is recorded as the audit actor. The method validates that the referenced employee exists, the policy is active, and a LeaveBalance exists for the derived fiscal year.; Throws a typed error if the leave request is not found, is not in DRAFT status, the employee does not exist, the policy is not found or inactive, no LeaveBalance exists for the employee+policy+fiscalYear, or remainingDays < computed business days. On any error, no usedDays mutation, status transition, audit log, or notification is performed.
- approve(leaveRequestId, approverId, approverRole) — Authorization is enforced inside the service using the passed approverRole: 'employee' → always throw ApproverNotAuthorizedError; 'hr_admin' → always allowed; 'manager' → allowed only if employee.managerId !== null and approverId === employee.managerId, else throw ApproverNotAuthorizedError. The role is an explicit parameter, never read from ambient state.; Throws a typed error if the request is not found or not in SUBMITTED status; throws ApproverNotAuthorizedError if the role/id combination fails the authorization rule. On authorization failure, no status transition, audit log, or notification is performed.
- reject(leaveRequestId, rejectorId, rejectorRole, reason) — Authorization uses the passed rejectorRole with the same rule as approve: 'employee' → always throw ApproverNotAuthorizedError; 'hr_admin' → always allowed; 'manager' → allowed only if employee.managerId !== null and rejectorId === employee.managerId, else throw ApproverNotAuthorizedError.; Throws a typed error if the request is not found or not in SUBMITTED status, or if the reason is empty/invalid; throws ApproverNotAuthorizedError on authorization failure. On success, usedDays is decremented by the business-day count, status transitions to REJECTED, audit is written, and notification is fired. On any error, no usedDays mutation or status transition occurs.
- cancel(leaveRequestId, actorId) — Identity-based (actorId only, no role parameter); the actorId is recorded as the audit actor. The method accepts requests in SUBMITTED or APPROVED status.; Throws a typed error if the request is not found or is not in SUBMITTED or APPROVED status. On success, usedDays is decremented by the business-day count (restoring the balance deducted at submission), status transitions to CANCELLED, audit is written, and notification is fired. On error, no mutation occurs.
- createDraft(dto: CreateLeaveRequestDto) — No authorization rule — creates a DRAFT request from the DTO; no balance check, no day-count computation, no employee/policy existence validation is required by the binding spec (the controller performs boundary validation in the next phase).; Throws a typed error only if the repository create fails; on success writes an audit log with action LEAVE_DRAFT_CREATED and returns the persisted LeaveRequest with status DRAFT.
- findById(id) and findByEmployee(employeeId) — Read-only operations with no authorization rule at the service layer (RBAC is enforced at the controller/middleware layer in the next phase); the service simply delegates to the repository.; idempotent; findById returns LeaveRequest | null (null when not found); findByEmployee returns LeaveRequest[] (empty array when none); neither throws on missing data — only propagates repository-level errors.
### Integration points — connect to these
- ILeaveBalanceRepository (src/modules/balance/balance.repository.ts) — submitDraft reads LeaveBalanceWithRemaining.remainingDays for the sufficiency check and calls updateUsedDays to increment; reject/cancel call updateUsedDays to decrement — this is the sole balance mutation path.
- IEmployeeRepository (src/modules/employee/employee.repository.ts) — submitDraft validates the employee exists; approve/reject read employee.managerId to enforce the RBAC authorization rule (manager match or hr_admin override).
- ILeavePolicyRepository (src/modules/policy/policy.repository.ts) — submitDraft looks up the LeavePolicy by leavePolicyId and verifies it is active before computing the fiscal year and proceeding with the balance check.
- IHolidayRepository (src/shared/holidays/holiday.repository.ts) — submitDraft (and reject/cancel, which need the same business-day count) fetch holidays in the request's date range via findByDateRange and pass them to countBusinessDays to compute the business-day count used for balance check, deduction, and restoration.
- INotificationService (src/modules/notification/notification.service.interface.ts) — Every state-changing method fires a notification (notifyLeaveSubmitted for submit, notifyLeaveStatusChange for approve/reject/cancel) as a best-effort side effect after the state transition and audit log are committed.
- IAuditLogRepository (src/modules/audit/audit.repository.ts) — Every state-changing method (submitDraft, approve, reject, cancel, createDraft) writes one audit log entry via create to satisfy GP-002, recording the actor, action, target, and contextual details.
- ILeaveRequestRepository (src/modules/leave/leave.repository.ts) — createDraft calls create to persist a new DRAFT request; submitDraft/approve/reject/cancel call update to transition status and set transition metadata fields; findById/findByEmployee delegate read queries.
- countBusinessDays (src/shared/utils/day-count.ts) — The single shared day-count function is the canonical business-day calculator used by submitDraft (for the sufficiency check and deduction amount) and by reject/cancel (for the restoration amount) — ensuring deduction and restoration always use identical day counts.

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