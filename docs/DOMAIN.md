## base

Base entity providing common fields for domain models.

### BaseEntity

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| created_at | Date | true |
| updated_at | Date | true |

## shared-types

Shared enums and utilities used across domain modules.

### LeaveTypeCode

String enum with uppercase values. Defined in `src/shared/types/leave-type-code.enum.ts`.

| Value | Description |
|-------|-------------|
| ANNUAL | Annual leave |
| SICK | Sick leave |
| EMERGENCY | Emergency leave |
| UNPAID | Unpaid leave |
| MATERNITY | Maternity leave |
| PATERNITY | Paternity leave |

### LeaveRequestStatus

String enum with uppercase values. Defined in `src/shared/types/leave-request-status.enum.ts`.

| Value | Description |
|-------|-------------|
| DRAFT | Leave request is in draft state |
| SUBMITTED | Leave request has been submitted |
| APPROVED | Leave request has been approved |
| REJECTED | Leave request has been rejected |
| CANCELLED | Leave request has been cancelled |

### countBusinessDays

Utility function in `src/shared/utils/business-days.ts`.

```
countBusinessDays(startDate: Date, endDate: Date, holidays: Date[]): number
```

Counts whole business days in the half-open interval `[startDate, endDate)`. Excludes weekends (Saturday/Sunday) and the provided holidays array. All dates are normalized to UTC midnight for calendar-date comparison. Throws if `endDate < startDate`.

## leave-type

Represents the catalog of leave categories available in the system. Managed by the `leave-type` module (`src/modules/leave-type/`).

### LeaveType

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| code | LeaveTypeCode | true |
| name | string | true |
| description | string \| undefined | false |
| isActive | boolean | true |
| createdAt | Date | true |
| updatedAt | Date | true |

**Invariants**
- `code` is one of the six `LeaveTypeCode` enum values and is unique across all rows.
- `isActive` controls visibility in `findAllActive`; `findById` and `findByCode` return the record regardless of active state.
- `createdAt` and `updatedAt` are presented as `Date` instances; the repository row mapper converts from the DB's snake_case timestamp columns.

**Repository** (`ILeaveTypeRepository` / `LeaveTypeRepository`)
- `findById(id: string): Promise<LeaveType | null>` — returns the LeaveType or null; parameterized query.
- `findByCode(code: LeaveTypeCode): Promise<LeaveType | null>` — returns the LeaveType or null; parameterized query.
- `findAllActive(): Promise<LeaveType[]>` — returns only rows where `is_active = true`; empty array when none.

**Dependencies**
- Imports `LeaveTypeCode` from `src/shared/types/` (Phase 1).
- Uses the shared `pool` from `src/shared/db/connection.ts` (injectable via constructor for testing).

## leave

Represents a leave record managed by the `leave` module, including leave requests and related leave-tracking data. **NOT YET BUILT — forward-looking spec.**

### LeaveStatus

| Value | Description |
|-------|-------------|
| DRAFT | Leave request is in draft state |
| SUBMITTED | Leave request has been submitted |
| APPROVED | Leave request has been approved |
| REJECTED | Leave request has been rejected |
| CANCELLED | Leave request has been cancelled |

### LeaveRequest

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| employeeId | string | true |
| leaveTypeId | string | true |
| startDate | Date | true |
| endDate | Date | true |
| reason | string \| undefined | false |
| status | LeaveRequestStatus | true |
| approvedBy | string \| null | false |
| approvedAt | Date \| null | false |
| createdAt | Date | true |
| updatedAt | Date | true |

**Relationships**
- `Employee` — many-to-one

### CreateLeaveRequestDto

| Field | Type | Required |
|-------|------|----------|
| employeeId | string | true |
| leaveTypeId | string | true |
| startDate | Date | true |
| endDate | Date | true |
| reason | string \| undefined | false |

### UpdateLeaveRequestDto

| Field | Type | Required |
|-------|------|----------|
| startDate | Date | false |
| endDate | Date | false |
| reason | string \| undefined | false |

### LeaveRequestQueryParams

| Field | Type | Required |
|-------|------|----------|
| status | LeaveRequestStatus | false |
| leaveTypeId | string | false |
| startDateFrom | Date | false |
| startDateTo | Date | false |
| endDateFrom | Date | false |
| endDateTo | Date | false |
| limit | number | false |
| offset | number | false |

## leave-balance

Represents leave balance data managed by the `leave-balance` module (`src/modules/leave-balance/`). Tracks per-employee, per-policy, per-fiscal-year entitlement and usage.

### LeaveBalance

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| employeeId | string | true |
| leavePolicyId | string | true |
| totalEntitlement | number | true |
| usedDays | number | true |
| remainingDays | number | true |
| fiscalYear | number | true |
| status | 'ACTIVE' \| 'EXHAUSTED' \| 'CLOSED' | true |
| createdAt | Date | true |
| updatedAt | Date | true |

**Invariants**
- `remainingDays` is a derived field computed as `totalEntitlement - usedDays` in the repository row mapper. It is NOT a stored database column.
- Unique constraint on `(employee_id, leave_policy_id, fiscal_year)`.
- Status lifecycle: ACTIVE → EXHAUSTED (when remainingDays reaches 0) → CLOSED (end of fiscal year).

**Repository** (`ILeaveBalanceRepository` / `LeaveBalanceRepository`)
- `findByEmployeeAndPolicy(employeeId, leavePolicyId, fiscalYear): Promise<LeaveBalance | null>` — returns the balance or null; parameterized query.
- `findByEmployee(employeeId, fiscalYear): Promise<LeaveBalance[]>` — returns all balances for the employee in the given fiscal year.
- `create(balance): Promise<LeaveBalance>` — inserts a new balance row.
- `updateUsedDays(id, usedDays): Promise<LeaveBalance>` — atomically updates `used_days` and returns the updated balance with recomputed `remainingDays`.

**Service Interface** (`ILeaveBalanceService`)
- `getBalance(employeeId, leavePolicyId, fiscalYear): Promise<LeaveBalance & { remainingDays: number }>`
- `deductDays(employeeId, leavePolicyId, fiscalYear, days): Promise<void>` — increments usedDays; throws if remaining would go below zero.
- `restoreDays(employeeId, leavePolicyId, fiscalYear, days): Promise<void>` — decrements usedDays; floors at zero.

**Dependencies**
- Uses the shared `pool` from `src/shared/db/connection.ts` (injectable via constructor for testing).

## employee

Represents employee data managed by the `employee` module (`src/modules/employee/`).

### Employee

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| employeeNumber | string | true |
| firstName | string | true |
| lastName | string | true |
| email | string | true |
| managerId | string \| null | false |
| department | string | true |
| hireDate | Date | true |
| terminationDate | Date \| null | false |
| employmentStatus | 'ACTIVE' \| 'INACTIVE' \| 'TERMINATED' | true |
| createdAt | Date | true |
| updatedAt | Date | true |

**Repository** (`IEmployeeRepository` / `EmployeeRepository`)
- `findById(id: string): Promise<Employee | null>` — returns the Employee or null; parameterized query.
- `findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>` — returns the Employee or null; parameterized query.
- `findAll(): Promise<Employee[]>` — returns all employees; empty array when none.

**Dependencies**
- Uses the shared `pool` from `src/shared/db/connection.ts` (injectable via constructor for testing).

## leave-policy

Represents leave policy data managed by the `leave-policy` module (`src/modules/leave-policy/`).

### LeavePolicy

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

**Repository** (`ILeavePolicyRepository` / `LeavePolicyRepository`)
- `findById(id): Promise<LeavePolicy | null>`
- `findByLeaveTypeId(leaveTypeId): Promise<LeavePolicy[]>`
- `findAllActive(): Promise<LeavePolicy[]>`

**Service Interface** (`ILeavePolicyService`)
- `getPolicyForLeaveType(leaveTypeId): Promise<LeavePolicy | null>`

## notification

Represents notification data managed by the `notification` module. **NOT YET BUILT — forward-looking spec.**

### Notification

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| recipientId | string | true |
| type | string | true |
| title | string | true |
| message | string | true |
| relatedEntityType | string \| null | false |
| relatedEntityId | string \| null | false |
| status | 'PENDING' \| 'SENT' \| 'READ' \| 'ARCHIVED' | true |
| createdAt | Date | true |
| readAt | Date \| null | false |

## audit

Represents audit data managed by the `audit` module. **NOT YET BUILT — forward-looking spec.**

### Audit

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| entityType | string | true |
| entityId | string | true |
| action | 'CREATE' \| 'UPDATE' \| 'DELETE' \| 'APPROVE' \| 'REJECT' | true |
| oldValues | Record<string, any> \| null | false |
| newValues | Record<string, any> \| null | false |
| performedBy | string \| null | false |
| performedAt | Date | true |
| createdAt | Date | true |
| updatedAt | Date | true |

### AuditLog

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| entityType | string | true |
| entityId | string | true |
| action | 'CREATE' \| 'UPDATE' \| 'DELETE' \| 'APPROVE' \| 'REJECT' | true |
| oldValues | Record<string, any> \| null | false |
| newValues | Record<string, any> \| null | false |
| performedBy | string \| null | false |
| performedAt | Date | true |

### AuditRecord

| Field | Type | Required |
|-------|------|----------|
| entity_type | string | true |
| entity_id | string | true |
| action | string | true |
| changed_by | string \| null | false |
| old_values | Record<string, any> \| null | false |
| new_values | Record<string, any> \| null | false |
| ip_address | string \| null | false |
| user_agent | string \| null | false |

### AuditServiceInterface

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| action | string | true |
| resourceType | string | true |
| resourceId | string | true |
| actorId | string | true |
| timestamp | Date | true |
| metadata | Record<string, unknown> \| null | false |

## validation

Represents validation data managed by the `validation` module, including validation results and related error information.

### ValidationResult

| Field | Type | Required |
|-------|------|----------|
| isValid | boolean | true |
| errors | string[] | true |

## system

Represents system-level status information, including health-check and version data.

### SystemStatus

| Field | Type | Required |
|-------|------|----------|
| up | boolean | true |
| version | string | true |
