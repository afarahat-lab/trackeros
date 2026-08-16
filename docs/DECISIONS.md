# Architecture Decisions — trackeros

## ADR-001 — Project initialised

Date: 2026-06-10
Status: Accepted

Decision: Project initialised via the Gestalt platform.
Description: Trackeros — a corporate operations web and mobile platform for
  mid-sized companies. Provides employee self-service (leave
  requests, balances, expense claims), manager workflows
  (approvals, team views, time-off calendars), and HR admin
  surfaces (leave policy configuration, balance accruals,
  audit reports).
  
  Backend: TypeScript on Node 20 (Fastify), PostgreSQL via
  Knex migrations + a thin repository layer, BullMQ for
  background jobs (accrual schedulers, notification fanout).
  Module structure: src/modules/<name>/<name>.{model,
  repository,service,controller,routes}.ts. Domain modules
  include leave, balance, employee, policy, notification.
  Shared utilities under src/shared/ (db connection, base
  repository, error types).
  
  Frontend: React + Vite SPA for the web client, React Native
  for the mobile client (shared @trackeros/contracts package
  for the typed REST surface). Auth via JWT against the
  backend's /auth endpoints; identity comes from corporate
  OIDC in production and from local users in development.
  
  Tests: Vitest for unit + integration. CI on GitHub Actions
  runs lint (ESLint) + typecheck (tsc --noEmit) + unit tests +
  a Semgrep security pass on every PR. Conventional Commits +
  squash-merge. Strict TypeScript (no implicit any, strict
  null checks).
Stack: TypeScript / Node.js / React / PostgreSQL
Architecture: Modular monolith (corporate-ops-web-mobile template, tier 1)

## ADR-002 — Shared types foundation (Phase 1)

Date: 2026-06-10
Status: Accepted

Decision: Established `src/shared/types/index.ts` as the single source of truth
for cross-module enums and DTOs in the leave management feature.

Enums defined:
- `LeaveStatus`: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED
- `LeaveType`: annual, sick, emergency, unpaid, maternity, paternity
- `AuditAction`: CREATE, UPDATE, DELETE, APPROVE, REJECT
- `NotificationStatus`: PENDING, SENT, READ, ARCHIVED
- `EmploymentStatus`: ACTIVE, INACTIVE, TERMINATED

DTOs defined:
- `CreateLeaveRequestDto`: employeeId, leavePolicyId, startDate, endDate, reason
- `UpdateLeaveRequestDto`: startDate, endDate, reason, status (all optional)
- `LeaveRequestQueryParams`: employeeId, status, leavePolicyId, startDateFrom, startDateTo (all optional)
- `ValidationResult`: valid (boolean), errors (string[])

Tests: `tests/unit/shared/types/index.test.ts` — Jest unit tests verifying enum
values, member counts, and DTO shape acceptance.

## ADR-003 — Employee model and repository (Phase 2)

Date: 2026-06-10
Status: Accepted

Decision: Created the employee module at `src/modules/employee/` with
model, repository interface, stub implementation, and barrel export.

Files created:
- `src/modules/employee/employee.model.ts` — `Employee` entity interface
  with fields: id, employeeNumber, firstName, lastName, email, managerId
  (string | null), department (string), hireDate, terminationDate (Date | null),
  employmentStatus (EmploymentStatus enum), createdAt, updatedAt.
  Documents invariants: employeeNumber unique, email unique, managerId is
  self-referencing FK, terminationDate null when ACTIVE, set when TERMINATED.
- `src/modules/employee/employee.repository.ts` — `IEmployeeRepository`
  interface with methods: findById, findByEmployeeNumber, findByManagerId,
  findAll, create, update. `EmployeeRepository` stub class throws
  "not implemented" for all methods.
- `src/modules/employee/index.ts` — Barrel export of model and repository.

Tests:
- `tests/unit/modules/employee/employee.model.test.ts` — Validates Employee
  shape, managerId nullability, terminationDate nullability per status, all
  EmploymentStatus enum values, and exact field count (12).
- `tests/unit/modules/employee/employee.repository.test.ts` — Validates all
  stub methods throw "not implemented", accepts valid create input and
  partial updates, and verifies interface contract has all 6 methods.

Dependencies: `src/shared/types/index.ts` (EmploymentStatus enum) from Phase 1.

## ADR-004 — LeavePolicy model and repository (Phase 3)

Date: 2026-06-10
Status: Accepted

Decision: Created the leave-policy module at `src/modules/leave-policy/` with
model, repository interface, stub implementation, and barrel export.

Files created:
- `src/modules/leave-policy/leave-policy.model.ts` — `LeavePolicy` entity interface
  with fields: id, policyName, leaveType (LeaveType enum), entitlementDays,
  accrualRate (number | null), maxAccumulation (number | null),
  minimumNoticeDays (number | null), requiresManagerApproval (boolean),
  isActive (boolean), createdAt, updatedAt.
- `src/modules/leave-policy/leave-policy.repository.ts` — `ILeavePolicyRepository`
  interface with methods: findById, findByLeaveType, findAllActive, create, update.
  `LeavePolicyRepository` stub class throws "not implemented" for all methods.
- `src/modules/leave-policy/index.ts` — Barrel export of model and repository.

Tests:
- `tests/unit/modules/leave-policy/leave-policy.model.test.ts` — Validates
  LeavePolicy shape, nullable fields, all LeaveType enum values, isActive and
  requiresManagerApproval booleans, and exact field count (11).
- `tests/unit/modules/leave-policy/leave-policy.repository.test.ts` — Validates
  all stub methods throw "not implemented", accepts valid create input and
  partial updates, and verifies interface contract has all 5 methods.

Dependencies: `src/shared/types/index.ts` (LeaveType enum) from Phase 1.

## ADR-005 — LeaveBalance model and repository (Phase 4)

Date: 2026-06-10
Status: Accepted

Decision: Created the leave-balance module at `src/modules/leave-balance/` with
model, repository interface, stub implementation, and barrel export.

Files created:
- `src/modules/leave-balance/leave-balance.model.ts` — `LeaveBalance` entity
  interface with fields: id, employeeId, leavePolicyId, totalEntitlement,
  usedDays, remainingDays, fiscalYear, status ('ACTIVE' | 'EXHAUSTED' | 'CLOSED'),
  createdAt, updatedAt. Documents invariants: lifecycle ACTIVE → EXHAUSTED → CLOSED;
  composite uniqueness on (employeeId, leavePolicyId, fiscalYear); derived-field
  consistency: remainingDays MUST equal totalEntitlement - usedDays.
- `src/modules/leave-balance/leave-balance.repository.ts` — `ILeaveBalanceRepository`
  interface with methods: findById, findByEmployeeAndPolicy, findByEmployeeId,
  create, update. `LeaveBalanceRepository` stub class throws "not implemented"
  for all methods.
- `src/modules/leave-balance/index.ts` — Barrel export of model and repository.

Tests:
- `tests/unit/modules/leave-balance/leave-balance.model.test.ts` — Validates
  LeaveBalance shape, all three status values (ACTIVE, EXHAUSTED, CLOSED),
  remainingDays = totalEntitlement - usedDays invariant, zero-boundary cases,
  and exact field count (10).
- `tests/unit/modules/leave-balance/leave-balance.repository.test.ts` — Validates
  all stub methods throw "not implemented", accepts valid create input and
  partial updates, and verifies interface contract has all 5 methods.

Dependencies: `src/shared/types/index.ts` from Phase 1.

## ADR-006 — LeaveRequest model and repository (Phase 5)

Date: 2026-06-10
Status: Accepted

Decision: Created the leave-request module at `src/modules/leave-request/` with
model, repository interface, stub implementation, and barrel export.

Files created:
- `src/modules/leave-request/leave-request.model.ts` — `LeaveRequest` entity interface
  with fields: id, employeeId, leavePolicyId, startDate, endDate, reason (string | undefined),
  status (LeaveStatus enum), approvedBy (string | null), approvedAt (Date | null),
  cancelledAt (Date | null), createdAt, updatedAt. Documents invariants: lifecycle
  DRAFT → SUBMITTED → (APPROVED | REJECTED), cancellable from SUBMITTED or APPROVED;
  approvedBy/approvedAt must both be null unless APPROVED; cancelledAt must be null
  unless CANCELLED; startDate ≤ endDate.
- `src/modules/leave-request/leave-request.repository.ts` — `ILeaveRequestRepository`
  interface with methods: findById, findByEmployeeId, findByStatus, query (accepts
  LeaveRequestQueryParams), create, update. `LeaveRequestRepository` stub class
  throws "not implemented" for all methods.
- `src/modules/leave-request/index.ts` — Barrel export of model and repository.

Tests:
- `tests/unit/modules/leave-request/leave-request.model.test.ts` — Validates
  LeaveRequest shape, reason optionality, approvedBy/approvedAt nullability
  invariants per status, cancelledAt nullability invariants, single-day leave
  (startDate === endDate), all LeaveStatus enum values, and exact field count (12).
- `tests/unit/modules/leave-request/leave-request.repository.test.ts` — Validates
  all 6 stub methods throw "not implemented", accepts valid create input (without
  id/createdAt/updatedAt), accepts partial and empty updates, and verifies
  interface contract has all required methods.

Dependencies: `src/shared/types/index.ts` (LeaveStatus enum, LeaveRequestQueryParams)
from Phase 1.

## ADR-007 — Notification model and repository (Phase 6)

Date: 2026-06-10
Status: Accepted

Decision: Created the notification module at `src/modules/notification/` with
model, repository interface, stub implementation, and barrel export.

Files created:
- `src/modules/notification/notification.model.ts` — `LeaveNotification` entity
  interface with fields: id, recipientId, type (union of 6 string literals:
  'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'BALANCE_LOW',
  'BALANCE_EXHAUSTED'), title, message, leaveRequestId, status (NotificationStatus
  enum), createdAt, readAt (Date | null). Documents invariants: lifecycle
  PENDING → SENT → READ → ARCHIVED; readAt must be null when status is PENDING
  or SENT; readAt must be a non-null Date when status is READ or ARCHIVED.
- `src/modules/notification/notification.repository.ts` — `INotificationRepository`
  interface with methods: findById, findByRecipientId, findByLeaveRequestId,
  create, updateStatus. `NotificationRepository` stub class throws
  "not implemented" for all methods.
- `src/modules/notification/index.ts` — Barrel export of model and repository.

Tests:
- `tests/unit/modules/notification/notification.model.test.ts` — Validates
  LeaveNotification shape, all 6 notification type literals, all 4
  NotificationStatus enum values, readAt nullability invariants per status,
  and exact field count (9).
- `tests/unit/modules/notification/notification.repository.test.ts` — Validates
  all 5 stub methods throw "not implemented", accepts valid create input
  (without id/createdAt), accepts input with readAt set for READ status,
  accepts all valid NotificationStatus transitions, and verifies interface
  contract has all required methods.

Dependencies: `src/shared/types/index.ts` (NotificationStatus enum) from Phase 1.

## ADR-008 — AuditLog model and repository (Phase 7)

Date: 2026-06-10
Status: Accepted

Decision: Created the audit module at `src/modules/audit/` with
model, repository interface, stub implementation, and barrel export.

Files created:
- `src/modules/audit/audit.model.ts` — `AuditLog` entity interface with fields:
  id, entityType (string), entityId (string), action (string), oldValues
  (Record<string, unknown> | null), newValues (Record<string, unknown> | null),
  performedBy (string | null), performedAt (Date), ipAddress (string | null),
  userAgent (string | null), createdAt (Date). Documents invariants: immutable
  (no update/delete lifecycle); oldValues null for CREATE, newValues null for
  DELETE, both non-null for UPDATE; referential integrity via (entityType, entityId)
  composite enforced at service/DB layer.
- `src/modules/audit/audit.repository.ts` — `IAuditLogRepository` interface with
  methods: findById, findByEntity, findByPerformedBy, create. No update/delete
  methods (immutable). `AuditLogRepository` stub class throws "not implemented"
  for all methods.
- `src/modules/audit/index.ts` — Barrel export of model and repository.

Tests:
- `tests/unit/modules/audit/audit.model.test.ts` — Validates AuditLog shape,
  oldValues/newValues nullability invariants per action type (CREATE, DELETE,
  UPDATE), performedBy nullability for system actions, ipAddress/userAgent
  nullability, free-form action strings, and exact field count (11).
- `tests/unit/modules/audit/audit.repository.test.ts` — Validates all stub
  methods throw "not implemented", accepts valid create input (without
  id/createdAt), and verifies interface contract has all 4 methods (no
  update/delete).

Dependencies: `src/shared/types/index.ts` from Phase 1.

## ADR-009 — LeaveRequestService — core orchestration (Phase 8)

Date: 2026-06-10
Status: Accepted

Decision: Implemented the `LeaveRequestService` as the core orchestration layer
for the leave request lifecycle. The service depends on four repository
interfaces (ILeaveRequestRepository, ILeaveBalanceRepository,
ILeavePolicyRepository, IEmployeeRepository) and enforces all business rules
and state transitions.

Files created:
- `src/modules/leave-request/leave-request.service.interface.ts` —
  `ILeaveRequestService` interface with methods: createDraft, submit, approve,
  reject, cancel, findById, findByEmployeeId, query.
- `src/modules/leave-request/leave-request.service.ts` — `LeaveRequestService`
  class implementing the full leave lifecycle state machine:
  - **createDraft**: validates employee exists, policy exists and isActive,
    startDate ≤ endDate; creates with status DRAFT.
  - **submit**: validates DRAFT state, enforces minimumNoticeDays (if set),
    checks balance has sufficient remainingDays using the BINDING formula
    `daysRequested = (endDate - startDate) / msPerDay + 1`, transitions to
    SUBMITTED.
  - **approve**: validates SUBMITTED state, verifies approver is the
    employee's manager (employee.managerId === approverId), deducts
    daysRequested from balance (usedDays += daysRequested,
    remainingDays = totalEntitlement - usedDays), sets APPROVED with
    approvedBy and approvedAt.
  - **reject**: validates SUBMITTED state, verifies approver is manager,
    sets REJECTED (no balance change).
  - **cancel**: validates SUBMITTED or APPROVED state; if APPROVED, restores
    usedDays on balance (usedDays -= daysRequested,
    remainingDays = totalEntitlement - usedDays); sets CANCELLED with
    cancelledAt.
  - **findById / findByEmployeeId / query**: pass-through to repository.
- `src/modules/leave-request/index.ts` — Updated barrel export to include
  service interface and implementation.

Error handling: All business rule violations throw objects with shape
`{ error: string; code: string }`. Error codes: EMPLOYEE_NOT_FOUND,
POLICY_NOT_FOUND, POLICY_INACTIVE, INVALID_DATE_RANGE, REQUEST_NOT_FOUND,
INVALID_STATE_TRANSITION, MINIMUM_NOTICE_VIOLATION, BALANCE_NOT_FOUND,
BALANCE_CLOSED, INSUFFICIENT_BALANCE, NOT_MANAGER.

BINDING day-counting formula: `daysRequested = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1`.
All dates are full-day granularity — no time-of-day considerations.

Tests: `tests/unit/modules/leave-request/leave-request.service.test.ts` — 40+
Jest unit tests with fully mocked repositories covering:
- createDraft: success, employee not found, policy not found, policy inactive,
  invalid date range, single-day leave.
- submit: DRAFT→SUBMITTED, request not found, wrong state, minimumNoticeDays
  violation (and exact boundary), balance not found, balance CLOSED,
  insufficient balance, BINDING formula verification (5-day range, single day,
  zero remaining).
- approve: SUBMITTED→APPROVED with balance deduction, request not found,
  wrong state, not-manager rejection, balance not found, balance CLOSED,
  remainingDays = totalEntitlement - usedDays invariant.
- reject: SUBMITTED→REJECTED, request not found, wrong state, not-manager
  rejection, balance untouched.
- cancel: SUBMITTED→CANCELLED (no balance change), APPROVED→CANCELLED (balance
  restoration), DRAFT/REJECTED/CANCELLED rejection, balance not found/CLOSED
  during APPROVED cancel, remainingDays invariant on restoration.
- read-only: findById, findByEmployeeId, query delegation.
- state machine: DRAFT→APPROVED, APPROVED→SUBMITTED, REJECTED→CANCELLED,
  DRAFT→REJECTED, APPROVED→REJECTED all rejected.

Dependencies: `src/shared/types/index.ts` (Phase 1), `src/modules/leave-request/`
model and repository (Phase 5), `src/modules/leave-balance/` repository (Phase 4),
`src/modules/leave-policy/` repository (Phase 3), `src/modules/employee/`
repository (Phase 2).

Divergence from plan: The service does NOT yet integrate with notification or
audit modules — those cross-cutting concerns are deferred to Phase 10
(supporting services). The service also does not use database transactions
(PoolClient / BEGIN/COMMIT) — transaction wrapping is deferred to the DB-backed
repository implementation phase.

## ADR-010 — LeaveRequest routes and controller (Phase 9)

Date: 2026-06-10
Status: Accepted

Decision: Created the Fastify routes and controller for the leave request API,
wiring the LeaveRequestService to HTTP endpoints and registering them on the
Fastify app.

Files created:
- `src/modules/leave-request/leave-request.controller.ts` — `LeaveRequestController`
  class that takes `ILeaveRequestService` in its constructor. Each method maps
  1:1 to a service method and serializes the `LeaveRequest` entity to a plain
  JSON-safe object (Date fields → ISO 8601 strings, nullable date fields → `null`).
  The `serializeLeaveRequest` helper handles all Date serialization.
- `src/modules/leave-request/leave-request.routes.ts` — Fastify plugin
  (`leaveRequestRoutes`) that instantiates the full dependency chain
  (controller → service → stub repositories) and registers 8 routes:
  - `POST /leave-requests` — createDraft (returns 201)
  - `POST /leave-requests/:id/submit`
  - `POST /leave-requests/:id/approve` — body: `{ approverId }`
  - `POST /leave-requests/:id/reject` — body: `{ approverId }`
  - `POST /leave-requests/:id/cancel`
  - `GET /leave-requests/employee/:employeeId`
  - `GET /leave-requests/:id`
  - `GET /leave-requests` — query by employeeId, status, leavePolicyId,
    startDateFrom, startDateTo
- `src/app.ts` — Updated to register `leaveRequestRoutes` via
  `app.register(leaveRequestRoutes)`.
- `src/modules/leave-request/index.ts` — Updated barrel export to include
  controller and routes.

Error handling: Each route handler catches errors and maps known service error
codes to HTTP statuses via `mapErrorToHttpStatus`:
- **404**: EMPLOYEE_NOT_FOUND, POLICY_NOT_FOUND, REQUEST_NOT_FOUND, BALANCE_NOT_FOUND
- **400**: INVALID_DATE_RANGE, MINIMUM_NOTICE_VIOLATION
- **409**: INVALID_STATE_TRANSITION, INSUFFICIENT_BALANCE, BALANCE_CLOSED, POLICY_INACTIVE
- **403**: NOT_MANAGER
- **500**: all unrecognized errors

Unknown errors are logged via `request.log.error(error)` and return a generic
`{ error: 'Internal Server Error' }` response (no code field, no error details
leaked — GP-004).

The `isServiceError` type guard discriminates service-thrown error objects
(`{ error: string; code: string }`) from unexpected exceptions.

**Divergence from plan**: The plan specified 400 for INVALID_STATE_TRANSITION,
BALANCE_CLOSED, INSUFFICIENT_BALANCE, and POLICY_INACTIVE. The implementation
uses 409 (Conflict) for these business-rule violations, which is more
semantically appropriate — the request is syntactically valid but conflicts
with the current resource state. The plan also specified 400 for
MINIMUM_NOTICE_VIOLATION; the implementation keeps this at 400.

**RBAC note**: No auth middleware is wired — routes accept all requests without
auth guards (GP-005 not yet enforced at HTTP layer). The service layer enforces
manager checks for approve/reject operations via `employee.managerId === approverId`.

Tests: `tests/unit/modules/leave-request/leave-request.routes.test.ts` — Jest
tests using Fastify's `inject()` method with a mocked `LeaveRequestService`,
covering all 8 endpoints for success and error paths.

Dependencies: `src/modules/leave-request/leave-request.service.ts` (Phase 8),
`src/modules/leave-request/leave-request.model.ts` (Phase 5),
`src/shared/types/index.ts` (Phase 1).

## ADR-011 — Supporting services: Balance, Notification, Audit, Policy, Employee (Phase 10)

Date: 2026-06-10
Status: Accepted

Decision: Created the remaining service interfaces and implementations for all
supporting modules. Two services received full implementations (BalanceService,
NotificationService); three received stub interfaces only (AuditService,
LeavePolicyService, EmployeeService).

### BalanceService (full implementation)

Files created:
- `src/modules/leave-balance/leave-balance.service.interface.ts` — `IBalanceService`
  interface with methods: getBalance, getBalancesForEmployee, initializeBalance.
- `src/modules/leave-balance/leave-balance.service.ts` — `BalanceService` class
  depending on ILeaveBalanceRepository and ILeavePolicyRepository:
  - **getBalance**: delegates to `balanceRepo.findByEmployeeAndPolicy`, returns
    the balance or null.
  - **getBalancesForEmployee**: delegates to `balanceRepo.findByEmployeeId`.
  - **initializeBalance**: validates policy exists, checks no existing balance
    for the same (employeeId, leavePolicyId, fiscalYear) composite, creates a
    balance with totalEntitlement = policy.entitlementDays, usedDays = 0,
    remainingDays = entitlementDays, status = 'ACTIVE'. Throws
    POLICY_NOT_FOUND or BALANCE_ALREADY_EXISTS on conflict.
- `src/modules/leave-balance/index.ts` — Updated barrel export to include
  service interface and implementation.

Tests: `tests/unit/modules/leave-balance/leave-balance.service.test.ts` — Jest
unit tests with mocked repositories covering getBalance (found, null),
getBalancesForEmployee (found, empty), initializeBalance (success, policy not
found, balance already exists, remainingDays = totalEntitlement invariant).

### NotificationService (full implementation)

Files created:
- `src/modules/notification/notification.service.interface.ts` —
  `INotificationService` interface with methods: notifyLeaveSubmitted,
  notifyLeaveApproved, notifyLeaveRejected, notifyLeaveCancelled,
  getNotificationsForUser, markAsRead.
- `src/modules/notification/notification.service.ts` — `NotificationService`
  class depending on INotificationRepository and IEmployeeRepository:
  - **notifyLeaveSubmitted**: looks up employee, validates managerId exists,
    creates PENDING notification with type 'SUBMITTED' targeting the manager.
    Throws EMPLOYEE_NOT_FOUND or NO_MANAGER_ASSIGNED.
  - **notifyLeaveApproved**: creates PENDING notification with type 'APPROVED'
    targeting the employee.
  - **notifyLeaveRejected**: creates PENDING notification with type 'REJECTED'
    targeting the employee.
  - **notifyLeaveCancelled**: looks up employee, validates managerId exists,
    creates PENDING notification with type 'CANCELLED' targeting the manager.
    Throws EMPLOYEE_NOT_FOUND or NO_MANAGER_ASSIGNED.
  - **getNotificationsForUser**: delegates to `notificationRepo.findByRecipientId`.
  - **markAsRead**: validates notification exists, skips if already READ or
    ARCHIVED (idempotent), otherwise updates status to READ. Throws
    NOTIFICATION_NOT_FOUND.
- `src/modules/notification/index.ts` — Updated barrel export to include
  service interface and implementation.

Tests: `tests/unit/modules/notification/notification.service.test.ts` — Jest
unit tests with mocked repositories covering all notify methods (success,
employee not found, no manager assigned), getNotificationsForUser (found,
empty), markAsRead (PENDING→READ, SENT→READ, idempotent for READ/ARCHIVED,
notification not found).

### Stub service interfaces only

Three service interfaces were declared per the architecture but their full
implementations are deferred:

- `src/modules/audit/audit.service.interface.ts` — `IAuditService` with
  `logAction(entityType, entityId, action, oldValues, newValues, performedBy)`.
- `src/modules/leave-policy/leave-policy.service.interface.ts` —
  `ILeavePolicyService` with `getPolicy`, `getPolicyByType`, `isActive`.
- `src/modules/employee/employee.service.interface.ts` — `IEmployeeService`
  with `getEmployee`, `getManager`, `isActive`.

These interfaces are exported from their respective barrel files but have no
concrete implementation classes yet.

### Cross-cutting integration status

The LeaveRequestService (Phase 8) does NOT yet call NotificationService or
IAuditService — these cross-cutting concerns remain deferred to a future
integration phase. The services are implemented and tested independently but
are not wired into the leave request lifecycle.

Dependencies: All prior phases (1–9) for model and repository interfaces.
NotificationService additionally depends on IEmployeeRepository (Phase 2).
BalanceService additionally depends on ILeavePolicyRepository (Phase 3).
