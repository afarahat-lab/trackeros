# Domain Model — trackeros

This file documents the domain entities as they exist in the committed source code. It reflects the as-built implementation, not the planned shape.

## Shared Enums

Defined in `src/shared/types/enums.ts`.

### LeaveType (enum)
String enum with lowercase member identifiers matching their string values:
- `annual = 'annual'`
- `sick = 'sick'`
- `emergency = 'emergency'`
- `unpaid = 'unpaid'`
- `maternity = 'maternity'`
- `paternity = 'paternity'`

### LeaveStatus (enum)
String enum with uppercase member identifiers matching their string values:
- `DRAFT = 'DRAFT'`
- `SUBMITTED = 'SUBMITTED'`
- `APPROVED = 'APPROVED'`
- `REJECTED = 'REJECTED'`
- `CANCELLED = 'CANCELLED'`

### AuditAction (enum)
String enum with uppercase member identifiers matching their string values:
- `CREATED = 'CREATED'`
- `SUBMITTED = 'SUBMITTED'`
- `APPROVED = 'APPROVED'`
- `REJECTED = 'REJECTED'`
- `CANCELLED = 'CANCELLED'`
- `BALANCE_DEDUCTED = 'BALANCE_DEDUCTED'`
- `BALANCE_RESTORED = 'BALANCE_RESTORED'`

## Shared DTOs

Defined in `src/shared/types/dtos.ts`.

### LeaveRequestDTO
Transport shape for a LeaveRequest. All date fields are ISO strings.

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| employeeId | string | true |
| leaveTypeId | string | true |
| startDate | string | true |
| endDate | string | true |
| reason | string \| undefined | false |
| rejectionReason | string \| undefined | false |
| status | LeaveStatus | true |
| approvedBy | string \| null | true |
| approvedAt | string \| null | true |
| cancelledAt | string \| null | true |
| createdAt | string | true |
| updatedAt | string | true |

### LeaveBalanceDTO
Transport shape for a LeaveBalance. All date fields are ISO strings.

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| employeeId | string | true |
| leaveTypeId | string | true |
| policyId | string | true |
| totalEntitlement | number | true |
| usedDays | number | true |
| pendingDays | number | true |
| remainingDays | number | true |
| fiscalYear | number | true |
| status | 'ACTIVE' \| 'EXHAUSTED' \| 'FROZEN' | true |
| createdAt | string | true |
| updatedAt | string | true |

## Shared Utilities

### business-day.ts (`src/shared/utils/business-day.ts`)

- `countBusinessDays(startDate: Date, endDate: Date, holidays: Date[]): number` — counts weekdays (Mon–Fri) between two dates inclusive, excluding weekends and provided holidays. Returns 0 if startDate > endDate.
- `DEFAULT_HOLIDAYS: Date[]` — empty array placeholder for future holidays table.

## Employee Module

Source: `src/modules/employee/`

### Employee (entity)

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| employeeNumber | string | true |
| firstName | string | true |
| lastName | string | true |
| email | string | true |
| managerId | string \| null | false |
| department | string \| null | false |
| hireDate | Date | true |
| terminationDate | Date \| null | false |
| employmentStatus | 'ACTIVE' \| 'INACTIVE' \| 'TERMINATED' | true |
| createdAt | Date | true |
| updatedAt | Date | true |
| deletedAt | Date \| null | false |

**Repository** (`IEmployeeRepository` / `EmployeeRepository`):
- `findById`, `findByEmployeeNumber`, `findByManagerId`, `findAll`, `create`, `update`, `softDelete`

**Service** (`IEmployeeService` / `EmployeeService`):
- `getEmployeeById`, `getEmployeeByNumber`, `getSubordinates`, `getAllEmployees`, `createEmployee`, `updateEmployee`, `terminateEmployee`
- `terminateEmployee` sets `employmentStatus = 'TERMINATED'`, `terminationDate = now`, and calls `softDelete`.

## Leave-Policy Module

Source: `src/modules/leave-policy/`

### LeaveType (entity)

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| code | string | true |
| label | string | true |
| description | string \| undefined | false |
| isActive | boolean | true |
| createdAt | Date | true |
| updatedAt | Date | true |

### LeavePolicy (entity)

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| policyName | string | true |
| leaveTypeId | string | true |
| entitlementDays | number | true |
| accrualRate | number \| undefined | false |
| maxAccumulation | number \| undefined | false |
| minimumNoticeDays | number \| undefined | false |
| requiresManagerApproval | boolean | true |
| isActive | boolean | true |
| createdAt | Date | true |
| updatedAt | Date | true |

**Repository** (`ILeavePolicyRepository` / `LeavePolicyRepository`):
- `findById`, `findByLeaveTypeId`, `findActiveByLeaveTypeId`, `findAll`, `create`, `update`

**Service** (`ILeavePolicyService` / `LeavePolicyService`):
- `getActivePolicy`, `getPolicyById`, `getAllPolicies`, `createPolicy`, `updatePolicy`

## Leave-Balance Module

Source: `src/modules/leave-balance/`

### LeaveBalance (entity)

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| employeeId | string | true |
| leaveTypeId | string | true |
| policyId | string | true |
| totalEntitlement | number | true |
| usedDays | number | true |
| pendingDays | number | true |
| remainingDays | number | true |
| fiscalYear | number | true |
| status | 'ACTIVE' \| 'EXHAUSTED' \| 'FROZEN' | true |
| createdAt | Date | true |
| updatedAt | Date | true |

**Key rule**: `remainingDays` is computed at read time as `totalEntitlement - usedDays` and is never stored in the database. The repository's `rowToLeaveBalance` mapper computes it, and `remainingDays` is excluded from INSERT/UPDATE (`READ_ONLY_FIELDS`).

**Repository** (`ILeaveBalanceRepository` / `LeaveBalanceRepository`):
- `findById`, `findByEmployeeAndType`, `findByEmployee`, `create`, `update`, `incrementUsedDays`, `decrementUsedDays`
- `incrementUsedDays` / `decrementUsedDays` use atomic SQL (`SET used_days = used_days +/- $2`).

**Service** (`ILeaveBalanceService` / `LeaveBalanceService`):
- `getBalance`, `getAllBalances`, `initializeBalance`, `deductDays`, `restoreDays`
- `initializeBalance` looks up the active policy via `ILeavePolicyService`, creates a balance with `totalEntitlement = policy.entitlementDays`, `usedDays = 0`, `pendingDays = 0`, `status = 'ACTIVE'`.
- `deductDays` checks `totalEntitlement - usedDays - days >= 0` before atomically incrementing `usedDays`. Throws `InsufficientBalanceError` if insufficient.
- `restoreDays` atomically decrements `usedDays`. Throws if `usedDays` would go below zero.
- Custom error classes: `NoActivePolicyError`, `BalanceNotFoundError`, `InsufficientBalanceError`.

## Leave-Request Module

Source: `src/modules/leave-request/`

### LeaveRequest (entity)

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| employeeId | string | true |
| leaveTypeId | string | true |
| startDate | Date | true |
| endDate | Date | true |
| reason | string \| undefined | false |
| rejectionReason | string \| undefined | false |
| status | LeaveStatus | true |
| approvedBy | string \| null | false |
| approvedAt | Date \| null | false |
| cancelledAt | Date \| null | false |
| createdAt | Date | true |
| updatedAt | Date | true |

**Repository** (`ILeaveRequestRepository` / `LeaveRequestRepository`):
- `findById`, `findByEmployee`, `findByStatus`, `findByApprover`, `findPendingByManager`, `create`, `update`, `updateStatus`
- `findPendingByManager` joins `employees` to find submitted requests for subordinates.
- `updateStatus` accepts optional `extra` with `rejectionReason`, `approvedBy`, `approvedAt`, `cancelledAt`.

### Service (`ILeaveRequestService` / `LeaveRequestService`)

Constructor-injected dependencies: `ILeaveRequestRepository`, `ILeaveBalanceService`, `IEmployeeService`, `ILeavePolicyService`, `IAuditRepository`, `INotificationService`.

**Custom error classes** (defined in `leave-request.service.ts`):
- `InvalidStateTransitionError` — thrown when a transition is not allowed from the current status.
- `UnauthorizedApproverError` — thrown when the approver is neither the employee's manager nor an HR admin.
- `RequestOwnershipError` — thrown when an employee tries to act on a request they don't own.

**Methods**:

- `submitDraft(requestId, employeeId)`: Validates ownership (employeeId must match request.employeeId). Validates current status is DRAFT. Looks up active policy. Computes business days via `countBusinessDays`. Initializes balance if needed. Atomically deducts days. If employee has no manager (`managerId === null`), logs escalation to HR admin (does not block submission). Updates status to SUBMITTED. Creates audit record. Sends notification.

- `approveRequest(requestId, approverId)`: Validates current status is SUBMITTED. Looks up the request's employee. Authorizes if `approverId === employee.managerId` OR (`employee.managerId === null` AND `approverId !== employeeId`). Sets `approvedBy` and `approvedAt`. Updates status to APPROVED. Creates audit. Sends notification.

- `rejectRequest(requestId, approverId, rejectionReason)`: Requires non-empty rejectionReason. Validates current status is SUBMITTED. Same authorization check as approve. Restores balance days. Sets rejectionReason. Updates status to REJECTED. Creates audit. Sends notification.

- `cancelRequest(requestId, employeeId)`: Validates ownership. Validates current status is SUBMITTED or APPROVED. Restores balance days (days were deducted on submit). Sets `cancelledAt`. Updates status to CANCELLED. Creates audit. Sends notification.

- `getRequestById(id)`, `getEmployeeRequests(employeeId)`, `getPendingForManager(managerId)`: Read-through to repository.

### Controller (`LeaveRequestController`)

Reads authenticated user identity from `request.user` (Fastify request decoration with shape `{ id: string; role: string }`). If `request.user` is absent/undefined, returns 401.

**RBAC approach (as-built divergence)**: RBAC is enforced at the **service layer** via custom error classes, not at the controller boundary. The controller maps error classes to HTTP status codes:
- `RequestOwnershipError` → 403
- `UnauthorizedApproverError` → 403
- `InvalidStateTransitionError` → 409
- Other `Error` → 400
- Unknown → 500

**HR-admin identification (as-built divergence)**: The implementation does NOT use `request.user.role` for HR-admin checks. Instead, it uses the heuristic `employee.managerId === null && approverId !== request.employeeId` — i.e., if the employee has no manager, any authenticated user who is not the employee themselves can act as approver. The `request.user.role` field is accepted by the controller type but never read or checked.

**Handler methods**: `submit`, `approve`, `reject`, `cancel`, `getById`, `getMyRequests`, `getPendingForManager`.

### Routes (`leaveRequestRoutes`)

Fastify plugin function registered under prefix `/api/leave-requests`. Manually instantiates all dependencies (repositories, services) and wires them together — no DI container.

**Endpoints**:
- `POST /api/leave-requests/:requestId/submit`
- `POST /api/leave-requests/:requestId/approve`
- `POST /api/leave-requests/:requestId/reject`
- `POST /api/leave-requests/:requestId/cancel`
- `GET /api/leave-requests/:requestId`
- `GET /api/leave-requests/my`
- `GET /api/leave-requests/pending`

### `index.ts` barrel (not updated in Phase 10)

The barrel still only re-exports `LeaveRequest`, `ILeaveRequestRepository`, and `LeaveRequestRepository`. The service, controller, and routes are not exported from the barrel. This is a known gap.

## Audit Module

Source: `src/modules/audit/`

### AuditRecord (entity)

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| entityType | string | true |
| entityId | string | true |
| action | AuditAction | true |
| performedBy | string | true |
| details | Record<string, unknown> \| null | false |
| createdAt | Date | true |

**Divergence note**: The reconciled architecture specified `audit_logs` with `old_values`/`new_values`/`performed_at`/`updated_at` columns. The implementation uses `audit_records` with a single `details` JSON column and `created_at` (no `updated_at`). This is the as-built shape.

**Repository** (`IAuditRepository` / `AuditRepository`):
- `create`, `findByEntity`, `findByUser`

## Notification Module

Source: `src/modules/notification/`

### INotificationService / NotificationService

Console-log stub implementation. Methods:
- `notifyLeaveSubmitted(request: LeaveRequestDTO): Promise<void>`
- `notifyLeaveApproved(request: LeaveRequestDTO): Promise<void>`
- `notifyLeaveRejected(request: LeaveRequestDTO): Promise<void>`
- `notifyLeaveCancelled(request: LeaveRequestDTO): Promise<void>`

No database persistence — real email/SMS delivery is deferred.

## Status Module

Source: `src/modules/status/`

### SystemStatus (value object)

| Field | Type | Required |
|-------|------|----------|
| up | boolean | true |
| version | string | true |

No database or repository — purely read-only health check.
