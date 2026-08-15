# Implement this phase: Phase 9: LeaveRequestService

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/73542714-9897-4d99-9509-1a7bb9190c33/9/1`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Replace the blanket 'read all Phases 1-8 files before generating' directive with: (1) a specific minimal file list to read — leave-request.model.ts, leave-request.repository.ts, leave-balance.service.interface.ts, employee.repository.ts, employee.model.ts, leave-policy.model.ts, leave.types.ts; (2) inline the key dependency signatures the service must implement against (ILeaveRequestRepository, IEmployeeRepository, ILeavePolicyRepository, ILeaveBalanceService, IAuditLogRepository, INotificationRepository method shapes, plus LeaveRequest/LeaveRequestStatus/LeaveType types) directly in the intent so reading is optional rather than mandatory. Keep the business-rule spec and the three-file deliverable list unchanged.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Business policy answers for the leave management module:

1/7. Fiscal (leave) year: CALENDAR YEAR (Jan 1 to Dec 31), organisation-wide, keyed off the leave startDate. Not a configurable fiscal year, not hire-date anniversary.

2. Cross-fiscal-year request (e.g. Dec to Jan): deduct the WHOLE request from a single fiscal year — the fiscal year of startDate. Do not split across years.

3. Accrual: full entitlement granted UPFRONT at the start of the fiscal year (annual lump-sum), not accrued over time. Mid-year hires: pro-rate the first year by the whole months remaining from the hire date (rounded down).

4/8. Carryover + balance: USE-IT-OR-LOSE-IT — unused days do NOT carry over across fiscal years (no carryover limit needed). Balance: available = entitled - (used + pending). Deduct on APPROVAL (on submission the days are held as PENDING/reservation; on approval pending -> used; on reject/cancel release the reservation).

5/9. Manager resolution + employee data: the LeaveRequest service obtains employee data (managerId, employmentStatus, hireDate) via an IEmployeeRepository interface (dependency-injected), backed by an employees table — the SAME repository-interface pattern the other modules use. The JWT / request context provides ONLY the caller identity (employeeId) and role for RBAC; the manager relationship, hire date, and employment status are looked up via IEmployeeRepository (do NOT read them from the JWT). Approvals/notifications route to the target employees managerId; if managerId is null, escalate to HR (a user with role hr_admin). Managers may act only on their direct reports.

6. Day counting: BUSINESS/WORKING DAYS only — exclude weekends (Sat/Sun) and public holidays. Both startDate and endDate are INCLUSIVE. WHOLE DAYS ONLY — no half-days (a half-day request is not supported; minimum 1 day).

Cross-cutting rules throughout:
- Overlapping leave requests are prevented (reject a new SUBMITTED/APPROVED request overlapping an existing SUBMITTED/APPROVED one for the same employee).
- Balances auto-created for all leave types on employee creation.
- Emergency leave is a SEPARATE pool (distinct from annual/sick) and bypasses the advance-notice requirement, but still requires approval and deducts from its own balance.
- Every endpoint enforces RBAC (employees on their own records; managers approve/reject direct reports) plus input validation.
- Only ACTIVE employees may submit leave. [BINDING RULE — operator decision resolving: How is the fiscal year determined for LeaveBalance assignment? Is it calendar year (Jan 1 – Dec 31), a company-specific fiscal year (e.g., Apr 1 – Mar 31), or configurable per policy?; What happens when a LeaveRequest spans two fiscal years (e.g., startDate in December, endDate in January)?; How does accrual work for annual leave? Is the full entitlement granted upfront at the start of the fiscal year, or does it accrue over time?; Do unused leave days carry over to the next fiscal year, and if so, up to what limit?; How is an employee's manager resolved for routing approvals and notifications?; How are leave days counted for balance deduction — calendar days (inclusive start..end) or working/business days? Does a half-day leave consume 0.5 or 1 day?; What defines the fiscal_year boundary for leave balances — calendar year, a configurable fiscal year (e.g. Apr–Mar), or employee hire-date anniversary?; How is leave balance computed — simple remaining = allocated - used, or does it involve accrual rules (e.g. pro-rata monthly accrual, carry-over from prior year)?; How is an employee's manager resolved? The LeaveRequest service needs a managerId for routing approvals and notifications.; apply everywhere these apply, not in one place only]

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The ILeaveRequestService interface must be consumed by Phase 10's controller, so its method names and return types must match the operations declared in PLAN.md Phase 9: submit, approve, reject, cancel, findById, findByEmployeeId, findPendingByManagerId. The interface file path must be src/modules/leave-request/leave-request.service.interface.ts. (see `PLAN.md`)
- The service's approve flow must call ILeaveRequestRepository.approveRequest (7th method, sets status=APPROVED + approved_by + approved_at) rather than updateStatus (which only sets status + updated_at). The repository interface at src/modules/leave-request/leave-request.repository.ts declares both methods; the service must use the correct one per the transition semantics. (see `src/modules/leave-request/leave-request.repository.ts`)
- The service must call ILeaveBalanceService.deductOnApproval and releaseOnRejectionOrCancellation with the exact parameter shapes declared in src/modules/leave-balance/leave-balance.service.interface.ts: (employeeId: string, leaveType: LeaveType, days: number, fiscalYear: number, client?: PoolClient). The fiscalYear must be the calendar year of the request's startDate. (see `src/modules/leave-balance/leave-balance.service.interface.ts`)
- The service must resolve employee data (managerId, employmentStatus) via IEmployeeRepository.findById as declared in src/modules/employee/employee.repository.ts — not via IEmployeeService. The PLAN.md Phase 9 spec explicitly names IEmployeeRepository as the injected dependency for manager resolution, and the reconciled architecture confirms managerId is read from the employee record. (see `src/modules/employee/employee.repository.ts`)
- The service must write audit records via IAuditLogRepository.create with the input shape declared in src/modules/audit-log/audit-log.repository.ts: Omit<AuditLog, 'id' | 'createdAt'>, which requires entityType, entityId, action (AuditAction enum), oldValues, newValues, performedBy, performedAt, ipAddress, userAgent. The action must use the AuditAction enum values from src/shared/types/leave.types.ts (CREATED, APPROVED, REJECTED, CANCELLED). (see `src/modules/audit-log/audit-log.repository.ts`)
- The service must create notifications via INotificationRepository.create with the input shape declared in src/modules/notification/notification.repository.ts: Omit<Notification, 'id' | 'createdAt' | 'readAt'>, which requires recipientId, type (NotificationType enum), title, message, relatedEntityType ('LeaveRequest' | 'LeaveBalance' | null), relatedEntityId, status (NotificationStatus). The type must use NotificationType enum values from src/shared/types/leave.types.ts. (see `src/modules/notification/notification.repository.ts`)
- The service must use the LeaveType, LeaveRequestStatus, AuditAction, and NotificationType enums from src/shared/types/leave.types.ts — not string literals. The LeaveRequestStatus values (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED) govern state transitions; LeaveType.EMERGENCY triggers the notice bypass; AuditAction and NotificationType values must match the enum definitions exactly. (see `src/shared/types/leave.types.ts`)
- The service's LeaveRequest type usage must match the interface declared in src/modules/leave-request/leave-request.model.ts (id, employeeId, leaveType, startDate, endDate, reason, status, approvedBy, approvedAt, createdAt, updatedAt). The create input omits id/createdAt/updatedAt per ILeaveRequestRepository.create's Omit type. (see `src/modules/leave-request/leave-request.model.ts`)
- The service must resolve the active leave policy via ILeavePolicyRepository (injected per PLAN.md Phase 9), filtering to isActive === true to obtain minimumNoticeDays for the notice check. The repository interface at src/modules/leave-policy/leave-policy.repository.ts declares findByLeaveType(leaveType, client?) which returns LeavePolicy[]; the service must filter to the active policy, consistent with how LeaveBalanceService.findActivePolicy operates. (see `src/modules/leave-policy/leave-policy.repository.ts`)
### Entity invariants — enforce these
- Reuse or extend `LeaveRequest`: Lifecycle: DRAFT → SUBMITTED → (APPROVED | REJECTED); any non-terminal state → CANCELLED. The service must only transition a request from SUBMITTED to APPROVED or REJECTED, and may transition from DRAFT, SUBMITTED, or APPROVED to CANCELLED. A request already in a terminal state (APPROVED, REJECTED, CANCELLED) must not be re-transitioned by approve/reject/cancel.
- Reuse or extend `LeaveRequest`: On APPROVED, approvedBy must be set to the approver's employee id and approvedAt must be stamped — this is achieved via ILeaveRequestRepository.approveRequest (which sets status + approved_by + approved_at), NOT via updateStatus (which only sets status + updated_at). The service must use approveRequest for the approve flow and updateStatus for reject/cancel.
- Reuse or extend `LeaveBalance`: Balance is deducted only on APPROVAL (via ILeaveBalanceService.deductOnApproval) and released only on CANCEL of a previously-APPROVED request (via ILeaveBalanceService.releaseOnRejectionOrCancellation). Rejection has no balance impact. Cancellation from DRAFT or SUBMITTED has no balance impact (no deduction was made). The fiscal year for deduction is always the calendar year of the request's startDate, even for cross-fiscal-year ranges.
- Reuse or extend `AuditLog`: Every state transition on a LeaveRequest produces exactly one immutable audit record with entityType='LeaveRequest', the request's id as entityId, the AuditAction matching the transition (CREATED for submit, APPROVED for approve, REJECTED for reject, CANCELLED for cancel), oldValues capturing the prior state, newValues capturing the new state, and performedBy set to the actor's identity.
- Reuse or extend `Notification`: Notifications are created (not just queued) via INotificationRepository.create on each transition with the correct NotificationType and recipient: LEAVE_SUBMITTED → manager (or HR if managerId is null), LEAVE_APPROVED → requesting employee, LEAVE_REJECTED → requesting employee, LEAVE_CANCELLED → manager if the request was previously SUBMITTED or APPROVED. Each notification references the LeaveRequest via relatedEntityType='LeaveRequest' and relatedEntityId=request.id.
- Reuse or extend `Employee`: Only employees with employmentStatus === ACTIVE may submit leave requests. The service must look up the employee via IEmployeeRepository.findById and reject submission for INACTIVE or TERMINATED employees, and for a null (not-found) employee. The manager relationship for approval routing is read from employee.managerId via the same repository — never from JWT claims.
### Interface contract — expose these operations (their shape is yours)
- submit — The caller must be the employee submitting their own leave (employeeId from caller identity). The target employee must have employmentStatus === ACTIVE, verified via IEmployeeRepository.findById.; Reject with a typed error when: employee not found or not ACTIVE; date range invalid (endDate before startDate); overlapping SUBMITTED/APPROVED request exists for the same employee; minimum notice not met for non-emergency leave with a non-null policy.minimumNoticeDays. No balance mutation occurs on submit.
- approve — The approver must be the request employee's direct manager (employee.managerId === approverId), verified via IEmployeeRepository.findById on the request's employeeId. Self-approval is prohibited (approverId !== request.employeeId). When employee.managerId is null, the operation escalates to an HR admin actor. The request must be in SUBMITTED status.; Reject with a typed error when: request not found; request not in SUBMITTED status; approver is not the direct manager and not an HR-admin escalator; approver is the requesting employee (self-approval); insufficient balance (ILeaveBalanceService.deductOnApproval throws). On success, the request transitions to APPROVED via approveRequest, balance is deducted, an audit record is written, and a notification is sent to the employee.
- reject — The rejector must be the request employee's direct manager (same authorization as approve) or an HR-admin escalator when managerId is null. The request must be in SUBMITTED status.; Reject with a typed error when: request not found; request not in SUBMITTED status; rejector is not authorized. No balance mutation occurs. On success, the request transitions to REJECTED via updateStatus, an audit record is written, and a notification is sent to the employee.
- cancel — The canceller must be the requesting employee (request.employeeId === cancellerId). Cancellation is allowed from DRAFT, SUBMITTED, or APPROVED states. A manager or other actor may not cancel another employee's request.; Reject with a typed error when: request not found; request is already in a terminal state (REJECTED or CANCELLED); canceller is not the requesting employee. When cancelling from APPROVED, balance is released via ILeaveBalanceService.releaseOnRejectionOrCancellation. An audit record is written and a notification is sent (to the manager if the request was previously SUBMITTED or APPROVED).
- findById — Read-only operation; authorization (own record or manager of direct report) is enforced at the controller layer in Phase 10. The service returns the LeaveRequest or null without authorization checks.; idempotent; Returns null when the request is not found. Does not throw on missing records.
- findByEmployeeId — Read-only operation; authorization enforced at the controller layer. The service returns the list without authorization checks.; idempotent; Returns an empty array when no requests exist for the employee. Does not throw.
- findPendingByManagerId — Read-only operation intended for managers; the managerId parameter identifies whose direct reports' pending requests to return. Authorization (caller is a manager) is enforced at the controller layer. The service delegates to ILeaveRequestRepository.findAllPendingByManagerId which JOINs employees on manager_id and filters to SUBMITTED status.; idempotent; Returns an empty array when no pending requests exist for the manager's direct reports. Does not throw.
### Integration points — connect to these
- ILeaveRequestRepository (src/modules/leave-request/leave-request.repository.ts) — Primary data access for leave requests: findById, findByEmployeeId, findOverlapping (overlap detection on submit), create (persist new request), approveRequest (approve transition with approved_by/approved_at), updateStatus (reject/cancel transition), findAllPendingByManagerId (manager's pending queue). All methods accept optional PoolClient for transaction participation.
- IEmployeeRepository (src/modules/employee/employee.repository.ts) — Resolves the submitting employee's employmentStatus (ACTIVE check on submit) and managerId (approval authorization and notification routing). findById is the key method. When managerId is null, the service escalates to HR.

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