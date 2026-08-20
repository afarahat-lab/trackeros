# Implement this phase: Phase 3: Leave Request & Notification (part 1/2)

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/3350baf6-9bd5-4cac-b688-f263972317f9/7`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the LeaveRequest and Notification domain models with their repository/service interfaces. This is the models+interfaces slice only — NO concrete implementations.

Read these files before generating: `src/shared/types/index.ts` (for LeaveType, LeaveStatus, NotificationType, NotificationStatus enums), `src/modules/employee/employee.model.ts` (for Employee reference), `src/modules/leave-policy/leave-policy.model.ts` (for LeavePolicy reference), `src/modules/balance/balance.model.ts` (for Balance reference).

Files to create:

1. `src/modules/leave-request/leave-request.model.ts` — Define the `LeaveRequest` entity interface with canonical fields: id, employeeId, leaveType (LeaveType), startDate (Date), endDate (Date), reason (string | undefined), status (LeaveStatus), approvedBy (string | null), approvedAt (Date | null), rejectionReason (string | undefined), createdAt (Date), updatedAt (Date). Define `ILeaveRequestRepository` interface with methods: findById(id: string), findByEmployeeId(employeeId: string), findByStatus(status: LeaveStatus), findByManagerId(managerId: string), create(request: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>), update(id: string, data: Partial<LeaveRequest>), updateStatus(id: string, status: LeaveStatus, approvedBy?: string, rejectionReason?: string). Define `ILeaveRequestService` interface with methods: submit(request: CreateLeaveRequestDto), approve(id: string, approverId: string), reject(id: string, approverId: string, reason: string), cancel(id: string, employeeId: string), getById(id: string), getByEmployee(employeeId: string), getPendingForManager(managerId: string). Also define `CreateLeaveRequestDto` with fields: employeeId, leaveType, startDate, endDate, reason (optional). Also define the validation schemas (Zod): createLeaveRequestSchema, updateLeaveRequestSchema.

2. `src/modules/notification/notification.model.ts` — Define the `Notification` entity interface with canonical fields: id, recipientId, type (NotificationType), title, message, relatedEntityType (string | null), relatedEntityId (string | null), status (NotificationStatus), createdAt (Date), readAt (Date | null). Define `INotificationRepository` interface with methods: findByRecipientId(recipientId: string), findByRecipientIdAndStatus(recipientId: string, status: NotificationStatus), create(notification: Omit<Notification, 'id' | 'createdAt'>), updateStatus(id: string, status: NotificationStatus, readAt?: Date). Define `INotificationService` interface with methods: notifyLeaveSubmitted(leaveRequest: LeaveRequest), notifyLeaveApproved(leaveRequest: LeaveRequest), notifyLeaveRejected(leaveRequest: LeaveRequest), notifyLeaveCancelled(leaveRequest: LeaveRequest), getNotifications(recipientId: string), markAsRead(id: string).

No tests in this phase — tests come in part 2/2.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Calendar days inclusive: start_date through end_date, all days count toward used_days (weekends and public holidays included). end_date is inclusive. [BINDING RULE — operator decision resolving: How are leave days counted — are start_date and end_date inclusive, and do weekends/public holidays count toward the used-days total?; apply everywhere these apply, not in one place only]

## Authoritative entity shape (from the reconciled architecture — MANDATORY, not your choice)
The entities below are shared, cross-module DATA CONTRACTS. Implement each one with EXACTLY these fields and types — identical names and types, with no additions, renames, splits (e.g. do NOT split a `fullName` into first/last), or omissions. This is a fixed contract other modules and later phases depend on; it is NOT an implementation choice, and it OVERRIDES any field list you might infer from PLAN.md or the phase description:
- `Notification` — the entity MUST have exactly these fields:
    - id: string
    - recipientId: string
    - type: string
    - title: string
    - message: string
    - relatedEntityType: string | null
    - relatedEntityId: string | null
    - status: string
    - createdAt: Date
    - readAt: Date | null

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The `create` method signature on both ILeaveRequestRepository and INotificationRepository must follow the same Omit pattern used by IBalanceRepository.create and ILeavePolicyRepository.create: the input omits server-generated fields (id, createdAt, updatedAt for LeaveRequest; id, createdAt for Notification). (see `src/modules/balance/balance.model.ts`)
- The `update` method signature on ILeaveRequestRepository must follow the same pattern as IBalanceRepository.update and ILeavePolicyRepository.update: accepts (id: string, data: Partial<T>) and returns Promise<T | null>. (see `src/modules/balance/balance.model.ts`)
- Error classes must carry a `code` property (string literal) matching the existing pattern: `LeaveRequestNotFoundError.code = 'NOT_FOUND'`, `LeaveRequestValidationError.code = 'VALIDATION_ERROR'`. This matches BalanceNotFoundError, InsufficientBalanceError, and AuditLogValidationError. (see `src/modules/balance/balance.model.ts`)
- The `LeaveRequest.leaveType` field must be typed as `LeaveType` (the enum, not `string`), matching how `LeavePolicy.leaveType` is typed in leave-policy.model.ts. (see `src/modules/leave-policy/leave-policy.model.ts`)
- The `LeaveRequest.status` field must be typed as `LeaveStatus` (the enum, not `string`), and `Notification.type` as `NotificationType`, `Notification.status` as `NotificationStatus` — matching the pattern where Employee.employmentStatus uses the EmploymentStatus enum. (see `src/modules/employee/employee.model.ts`)
- The `INotificationService` interface methods that accept a `LeaveRequest` parameter must import the `LeaveRequest` type from `../leave-request/leave-request.model` (or the leave-request module must import `INotificationService` from `../notification/notification.model`). The circular type reference must be resolved via TypeScript interface erasure — no runtime import cycles. (see `docs/ARCHITECTURE.md`)
### Entity invariants — enforce these
- Reuse or extend `LeaveRequest`: A LeaveRequest's status must always be one of the LeaveStatus enum values (draft, submitted, approved, rejected, cancelled). The approvedBy and approvedAt fields must both be null when status is 'draft' or 'submitted'; approvedBy must be non-null and approvedAt must be non-null when status is 'approved'; rejectionReason must be non-null when status is 'rejected'. startDate must be <= endDate.
- Reuse or extend `LeaveRequest`: LeaveRequest lifecycle: status transitions are only permitted along the path DRAFT → SUBMITTED → APPROVED | REJECTED, with CANCELLED reachable from SUBMITTED or APPROVED. Once REJECTED or CANCELLED, no further transitions are allowed. The interface must document these allowed transitions (e.g., via JSDoc on updateStatus or the service methods).
- Reuse or extend `Notification`: A Notification's status must always be one of the NotificationStatus enum values (pending, sent, read, archived). readAt must be null when status is 'pending' or 'sent'; readAt must be non-null when status is 'read'. The type field must be one of the NotificationType enum values and must correspond to the lifecycle event that triggered it.
### Interface contract — expose these operations (their shape is yours)
- ILeaveRequestRepository.updateStatus — Must return null (not throw) when the leave request with the given id does not exist. The caller (service) is responsible for throwing a domain error (LeaveRequestNotFoundError) when null is returned.
- ILeaveRequestService.submit — Must validate the DTO via createLeaveRequestSchema before processing. Must throw LeaveRequestValidationError for invalid input. Must throw domain errors for business rule violations (e.g., insufficient balance, overlapping request, inactive employee).
- ILeaveRequestService.approve — Must throw LeaveRequestNotFoundError if the request does not exist. Must throw a domain error if the request is not in 'submitted' status (invalid transition). The approverId must be recorded as approvedBy.
- ILeaveRequestService.reject — Must throw LeaveRequestNotFoundError if the request does not exist. Must throw a domain error if the request is not in 'submitted' status. The reason parameter must be non-empty; an empty reason must throw LeaveRequestValidationError.
- ILeaveRequestService.cancel — Must throw LeaveRequestNotFoundError if the request does not exist. Must throw a domain error if the request is not in 'submitted' or 'approved' status. The employeeId must match the request's employeeId (self-cancellation only); mismatch must throw a domain error.
- INotificationService.notifyLeaveSubmitted / notifyLeaveApproved / notifyLeaveRejected / notifyLeaveCancelled — Each method must create a Notification with relatedEntityType set to 'leave_request' and relatedEntityId set to the leaveRequest.id. The type field must match the corresponding NotificationType enum value. The recipientId must be derived from the leaveRequest (employeeId for submit/cancel notifications; employeeId for approval/rejection notifications to the requester).
### Integration points — connect to these
- src/shared/types/index.ts — Both modules import LeaveType, LeaveStatus, NotificationType, and NotificationStatus enums from the shared types module.
- src/modules/balance/balance.model.ts — ILeaveRequestService depends on IBalanceService for balance checks and deduction during submit/approve/cancel workflows. The interface reference (not concrete import) is needed for the service interface contract.
- src/modules/leave-policy/leave-policy.model.ts — ILeaveRequestService depends on ILeavePolicyService for policy lookup and entitlement validation during the submit workflow.
- src/modules/audit-log/audit-log.model.ts — ILeaveRequestService depends on IAuditLogRepository for writing audit records on every state-changing operation (submit, approve, reject, cancel), per GP-002.

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