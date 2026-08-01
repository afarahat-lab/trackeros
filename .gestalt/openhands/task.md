# Implement this phase: Phase 9: Leave service — core business logic

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/35df38af-c9d7-41ee-b412-79ee8d149189/9`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the leave service implementing all core business logic. This phase depends on ALL prior phases — read these files before generating any code:
- `src/shared/types/index.ts` (Phase 1)
- `src/modules/employee/employee.model.ts` (Phase 2)
- `src/modules/policy/policy.model.ts` (Phase 3)
- `src/modules/leave/leave.model.ts` (Phase 4)
- `src/modules/balance/balance.model.ts` (Phase 5)
- `src/modules/notification/notification.model.ts` (Phase 6)
- `src/modules/audit/audit.model.ts` (Phase 7)
- `src/shared/utils/day-count.ts` (Phase 8)

Files to create:
- `src/modules/leave/leave.service.interface.ts` — Define **ILeaveService** interface with methods:
  - `submitLeaveRequest(dto: CreateLeaveRequestDto): Promise<LeaveRequest>` — validates, checks balance, deducts, creates request, audits, notifies
  - `approveLeaveRequest(requestId: string, approverId: string): Promise<LeaveRequest>` — approves, audits, notifies employee
  - `rejectLeaveRequest(requestId: string, approverId: string, reason: string): Promise<LeaveRequest>` — rejects, restores balance, audits, notifies employee
  - `cancelLeaveRequest(requestId: string, employeeId: string): Promise<LeaveRequest>` — cancels, restores balance, audits
  - `getLeaveRequest(requestId: string): Promise<LeaveRequest | null>`
  - `getEmployeeLeaveRequests(employeeId: string, params?: LeaveRequestQueryParams): Promise<LeaveRequest[]>`

- `src/modules/leave/leave.service.ts` — Implement **LeaveService** class implementing ILeaveService. Constructor takes: ILeaveRepository, IBalanceRepository, IEmployeeRepository, IPolicyRepository, INotificationRepository, IAuditRepository.

  **submitLeaveRequest** logic:
  1. Look up employee; if employmentStatus is not ACTIVE, throw error.
  2. Look up policy by policyId; if not active, throw error.
  3. Compute fiscalYear = calendar year of startDate.
  4. Get or create LeaveBalance for (employeeId, policyId, fiscalYear). If creating, set totalEntitlement = policy.entitlementDays, usedDays = 0.
  5. Fetch holidays for the year via `getHolidaysForYear(fiscalYear)`.
  6. Compute requestedDays = `calculateBusinessDays(startDate, endDate, holidays)`.
  7. Check sufficiency: `balance.totalEntitlement - balance.usedDays >= requestedDays`. If not, throw error.
  8. Atomically increment usedDays by requestedDays via `balanceRepository.incrementUsedDays`.
  9. Create LeaveRequest with status SUBMITTED.
  10. Create AuditLog with action CREATE.
  11. Determine approver: if employee.managerId is not null, notify manager; if null, notify HR admin role (hardcoded role check for now — find employees with role 'hr_admin').
  12. Create Notification for approver.
  13. Return the created LeaveRequest.

  **approveLeaveRequest** logic:
  1. Find request; must be SUBMITTED.
  2. Update status to APPROVED, set approvedBy=approverId, approvedAt=now.
  3. Create AuditLog with action APPROVE.
  4. Notify employee.
  5. Return updated request.

  **rejectLeaveRequest** logic:
  1. Find request; must be SUBMITTED.
  2. Update status to REJECTED, set rejectionReason.
  3. Restore balance: decrement usedDays by the business-day count of the request's date range.
  4. Create AuditLog with action REJECT.
  5. Notify employee.
  6. Return updated request.

  **cancelLeaveRequest** logic:
  1. Find request; must be SUBMITTED or APPROVED; employeeId must match.
  2. Update status to CANCELLED.
  3. Restore balance: decrement usedDays by the business-day count.
  4. Create AuditLog with action UPDATE.
  5. Return updated request.

  **BINDING RULES applied**: Deduct-on-submission (increment usedDays at SUBMIT), restore-on-reject/cancel (decrement usedDays). Approval does NOT change usedDays again. No-manager escalates to HR admin. Business days only via shared utility. remainingDays is computed, never stored.

Include Jest unit tests in `tests/unit/modules/leave/leave.service.spec.ts` mocking all repository dependencies.

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
- The service must use calculateBusinessDays and getHolidaysForYear from src/shared/utils/day-count.ts (via the shared/utils barrel) for all day-count computations — the sufficiency check at submit, the restore at reject, and the restore at cancel. No inline date arithmetic or alternative day-count logic may exist in the service. (see `src/shared/utils/day-count.ts`)
- The service must use InsufficientBalanceError from src/modules/balance/balance.model.ts for balance-sufficiency failures, and must call IBalanceRepository.incrementUsedDays / decrementUsedDays (not updateUsedDays) for atomic balance mutations, matching the repository interface signatures defined in balance.model.ts. (see `src/modules/balance/balance.model.ts`)
- The service must use LeaveRequestStatus (SUBMITTED, APPROVED, REJECTED, CANCELLED), EmploymentStatus (ACTIVE), and AuditAction (CREATE, APPROVE, REJECT, UPDATE) enums from src/shared/types/index.ts for all status comparisons and audit actions — no hardcoded string literals for these values. (see `src/shared/types/index.ts`)
- The service must use ILeaveRepository.updateStatus for all status transitions (not the generic update method), matching the signature updateStatus(id, status, approvedBy?, rejectionReason?) defined in leave.model.ts, so that repository-level status-specific side effects (setting approvedAt, clearing rejection fields) are applied consistently. (see `src/modules/leave/leave.model.ts`)
- LeaveService must implement the ILeaveService interface defined in leave.service.interface.ts exactly — all six methods with matching signatures. The interface is the contract that Phase 10's controller will depend on. (see `src/modules/leave/leave.service.interface.ts`)
### Entity invariants — enforce these
- Reuse or extend `LeaveRequest`: State machine: SUBMITTED is the entry state created by submitLeaveRequest. APPROVED and REJECTED are reachable only from SUBMITTED. CANCELLED is reachable from SUBMITTED or APPROVED. REJECTED is terminal. The service must reject any transition that violates these allowed source states.
- Reuse or extend `LeaveBalance`: usedDays is a denormalized counter and the source of truth for consumption. It is incremented atomically at submission and decremented atomically at rejection or cancellation. It must never go below zero (decrementUsedDays guard) and must never exceed totalEntitlement (incrementUsedDays guard). remainingDays is always derived as totalEntitlement - usedDays, never stored or written.
- Reuse or extend `AuditLog`: Every state-changing leave operation produces exactly one immutable audit record with entityType 'leave_request'. The action must match the operation: CREATE for submit, APPROVE for approve, REJECT for reject, UPDATE for cancel. performedBy is the actor initiating the change (employeeId for submit/cancel, approverId for approve/reject).
- Reuse or extend `Notification`: Notifications are created for submit (to manager or HR admins), approve (to employee), and reject (to employee). No notification is created for cancel. All notifications are created with status PENDING and relatedEntityType 'leave_request' linking to the request id.
### Interface contract — expose these operations (their shape is yours)
- submitLeaveRequest(dto) — Caller identity is dto.employeeId; the service verifies the employee exists and is ACTIVE but does not perform RBAC (deferred to controller).; Throws Error for employee-not-found, employee-not-ACTIVE, policy-not-found, policy-inactive. Throws InsufficientBalanceError when totalEntitlement - usedDays < requestedDays. All errors are typed and propagated (GP-006).
- approveLeaveRequest(requestId, approverId) — approverId is the acting approver; RBAC verification that approverId is the employee's manager or an hr_admin is deferred to the controller/middleware layer.; Throws Error if request not found or status is not SUBMITTED. Throws Error if the repository updateStatus returns null (update failed). Does not modify balance.
- rejectLeaveRequest(requestId, approverId, reason) — approverId is the acting approver; RBAC verification deferred to controller/middleware.; Throws Error if request not found or status is not SUBMITTED. Throws Error if updateStatus returns null. Restores balance via decrementUsedDays only if a balance record exists (no throw if balance is null).
- cancelLeaveRequest(requestId, employeeId) — employeeId must match the request's employeeId; the service enforces this ownership check directly. RBAC role checks are deferred to controller/middleware.; Throws Error if request not found, status is not SUBMITTED or APPROVED, or employeeId does not match the request owner. Restores balance via decrementUsedDays only if a balance record exists. Does not create a notification.
- getLeaveRequest(requestId) / getEmployeeLeaveRequests(employeeId, params?) — No auth check in the service; RBAC deferred to controller/middleware.; idempotent; Pure read-through delegation to the leave repository. Returns null (getLeaveRequest) or empty array (getEmployeeLeaveRequests) when no records match. Produces no audit records or notifications.
### Integration points — connect to these
- src/modules/balance/ (IBalanceRepository) — The leave service depends on the balance repository for get-or-create balance, atomic incrementUsedDays at submission, and decrementUsedDays at reject/cancel. This is the deduct-on-submission / restore-on-reject-cancel binding.
- src/modules/employee/ (IEmployeeRepository) — The leave service depends on the employee repository for findById (employment status check, managerId resolution) and findAll (HR-admin escalation when managerId is null).
- src/modules/policy/ (IPolicyRepository) — The leave service depends on the policy repository for findById to validate the policy is active and to read entitlementDays for balance creation.
- src/modules/notification/ (INotificationRepository) — The leave service depends on the notification repository to create notifications for the approver on submit, and for the employee on approve and reject.
- src/modules/audit/ (IAuditRepository) — The leave service depends on the audit repository to write one audit record per state-changing operation (GP-002), with entityType 'leave_request' and the appropriate AuditAction.
- src/shared/utils/day-count.ts (calculateBusinessDays, getHolidaysForYear) — The leave service depends on the shared day-count utility as the single source of truth for business-day calculations across sufficiency checks and balance restoration.
- src/modules/leave/leave.controller.ts (Phase 10 — not yet built) — The ILeaveService interface is the contract that the future Phase 10 controller will consume; the service is the single entry point for all leave request state transitions and must remain stable for that consumer.

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