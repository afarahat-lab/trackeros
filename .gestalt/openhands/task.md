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
- The ILeaveService interface and LeaveService implementation must use the LeaveRequest entity shape and ILeaveRepository contract exactly as defined — create accepts Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>, updateStatus accepts (id, status, approvedBy?, rejectionReason?), findById returns LeaveRequest | null, findByEmployeeId accepts optional LeaveRequestQueryParams. (see `src/modules/leave/leave.model.ts`)
- The service must use IBalanceRepository methods exactly as defined: findByEmployeeAndPolicy(employeeId, policyId, fiscalYear) for balance lookup, create(Omit<LeaveBalance, 'id' | 'remainingDays' | 'createdAt' | 'updatedAt'>) for auto-creation (must NOT pass remainingDays), incrementUsedDays(id, days) for deduction (throws InsufficientBalanceError on insufficient), decrementUsedDays(id, days) for restoration (returns null on missing/negative). (see `src/modules/balance/balance.model.ts`)
- All day-count computations in the service must use calculateBusinessDays(startDate, endDate, holidays) with holidays from getHolidaysForYear(fiscalYear). No inline day-count logic. The same utility must be used for the sufficiency check, deduction amount, and restoration amount so all computations are identical. (see `src/shared/utils/day-count.ts`)
- AuditLog creation must use IAuditRepository.create(Omit<AuditLog, 'id'>) with the exact AuditAction enum values from shared/types (CREATE, APPROVE, REJECT, UPDATE) — not string literals. The performedBy field must be the employeeId for submit/cancel and the approverId for approve/reject. (see `src/modules/audit/audit.model.ts`)
### Entity invariants — enforce these
- Reuse or extend `LeaveRequest`: Lifecycle transitions are restricted: SUBMITTED is the only valid source state for APPROVED and REJECTED; SUBMITTED and APPROVED are the only valid source states for CANCELLED. DRAFT is never created by this service. REJECTED is terminal. The service must enforce these transitions and throw on any invalid source state.
- Reuse or extend `LeaveBalance`: usedDays is a denormalized counter and the source of truth for consumption; it is incremented atomically at SUBMIT and decremented atomically at REJECT/CANCEL. It must never be decremented at APPROVE. remainingDays is always derived (totalEntitlement - usedDays) and never persisted. A balance is auto-created with totalEntitlement = policy.entitlementDays, usedDays = 0, status ACTIVE when none exists for (employeeId, policyId, fiscalYear).
- Reuse or extend `AuditLog`: Every state-changing service operation writes exactly one AuditLog: submit → action CREATE (performedBy = employee), approve → action APPROVE (performedBy = approver), reject → action REJECT (performedBy = approver), cancel → action UPDATE (performedBy = employee). Read operations write none. The audit record's entityType and entityId must reference the LeaveRequest being acted upon.
- Reuse or extend `Notification`: Submit creates a notification to the approver (manager if managerId !== null, else all HR admins) with status PENDING and relatedEntityType 'leave_request'. Approve and reject create a notification to the employee. Cancel does not create a notification per the task's explicit 5-step logic.
### Interface contract — expose these operations (their shape is yours)
- submitLeaveRequest — Throws when employee not found or not ACTIVE; throws when policy not found or not active; throws InsufficientBalanceError (or equivalent) when balance insufficient or atomic increment fails. On success, returns the created LeaveRequest with status SUBMITTED.
- approveLeaveRequest — Throws when the request is not found or its status is not SUBMITTED. Does not modify usedDays. On success, returns the updated LeaveRequest with status APPROVED, approvedBy, and approvedAt set.
- rejectLeaveRequest — Throws when the request is not found or its status is not SUBMITTED. Restores balance via decrementUsedDays before returning. On success, returns the updated LeaveRequest with status REJECTED and rejectionReason set.
- cancelLeaveRequest — Throws when the request is not found, its status is not SUBMITTED or APPROVED, or the provided employeeId does not match the request's employeeId. Restores balance via decrementUsedDays. On success, returns the updated LeaveRequest with status CANCELLED.
- getLeaveRequest — idempotent; Returns the LeaveRequest or null without side effects. No audit, no notification, no balance change.
- getEmployeeLeaveRequests — idempotent; Returns an array (possibly empty) without side effects. Passes optional query params through to the repository.

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