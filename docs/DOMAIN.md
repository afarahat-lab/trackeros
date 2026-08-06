## shared

Shared types used across domain modules.

### UserRole

| Value | Description |
|-------|-------------|
| employee | Standard employee |
| manager | Manager with direct reports |
| hr_admin | HR administrator with full access |

### LeaveType

| Value | Description |
|-------|-------------|
| annual | Annual leave |
| sick | Sick leave |
| emergency | Emergency leave |
| unpaid | Unpaid leave |
| maternity | Maternity leave |
| paternity | Paternity leave |

### LeaveRequestStatus

| Value | Description |
|-------|-------------|
| DRAFT | Leave request is in draft state |
| SUBMITTED | Leave request has been submitted |
| APPROVED | Leave request has been approved |
| REJECTED | Leave request has been rejected |
| CANCELLED | Leave request has been cancelled |

## leave-request

Represents leave request data managed by the `leave-request` module.

### LeaveRequest

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| employeeId | string | true |
| leaveTypeId | string | true |
| leavePolicyId | string | true |
| startDate | Date | true |
| endDate | Date | true |
| daysCount | number | true |
| reason | string \| undefined | false |
| status | LeaveRequestStatus | true |
| approvedBy | string \| null | false |
| approvedAt | Date \| null | false |
| cancelledBy | string \| null | false |
| cancelledAt | Date \| null | false |
| createdAt | Date | true |
| updatedAt | Date | true |

**Relationships**
- `Employee` — many-to-one (employeeId)
- `LeaveType` — many-to-one (leaveTypeId)
- `LeavePolicy` — many-to-one (leavePolicyId)

### LeaveRequestFilters

| Field | Type | Required |
|-------|------|----------|
| employeeId | string | false |
| status | LeaveRequestStatus | false |
| leaveTypeId | string | false |
| startDateFrom | Date | false |
| startDateTo | Date | false |

### LeaveRequestStatusMetadata

| Field | Type | Required |
|-------|------|----------|
| approvedBy | string \| null | false |
| approvedAt | Date \| null | false |
| cancelledBy | string \| null | false |
| cancelledAt | Date \| null | false |

## leave-balance

Represents leave balance data managed by the `leave-balance` module.

### LeaveBalance

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| employeeId | string | true |
| policyId | string | true |
| totalEntitlement | number | true |
| usedDays | number | true |
| remainingDays | number | true |
| fiscalYear | number | true |
| status | 'ACTIVE' \| 'EXHAUSTED' \| 'CLOSED' | true |
| createdAt | Date | true |
| updatedAt | Date | true |

**Relationships**
- `Employee` — many-to-one
- `LeavePolicy` — many-to-one

## employee

Represents employee data managed by the `employee` module.

### Employee

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

## leave-policy

Represents leave policy data managed by the `leave-policy` module.

### LeavePolicy

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| policyName | string | true |
| leaveType | LeaveType | true |
| entitlementDays | number | true |
| accrualRate | number \| undefined | false |
| maxAccumulation | number \| undefined | false |
| minimumNoticeDays | number \| undefined | false |
| requiresManagerApproval | boolean | true |
| isActive | boolean | true |
| createdAt | Date | true |
| updatedAt | Date | true |

## notification

Represents notification data managed by the `notification` module.

### Notification

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| recipientId | string | true |
| type | 'LEAVE_SUBMITTED' \| 'LEAVE_APPROVED' \| 'LEAVE_REJECTED' \| 'LEAVE_CANCELLED' | true |
| title | string | true |
| message | string | true |
| relatedEntityType | 'LeaveRequest' | true |
| relatedEntityId | string | true |
| status | 'PENDING' \| 'SENT' \| 'READ' \| 'ARCHIVED' | true |
| createdAt | Date | true |
| readAt | Date \| null | false |

## audit

Represents audit data managed by the `audit` module.

### AuditLog

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| entityType | string | true |
| entityId | string | true |
| action | string | true |
| oldValues | Record<string, unknown> \| null | false |
| newValues | Record<string, unknown> \| null | false |
| performedBy | string \| null | false |
| performedAt | Date | true |
| ipAddress | string \| null | false |
| userAgent | string \| null | false |
| createdAt | Date | true |

**Invariants**
- Immutable: no update or delete operations exposed by the repository (GP-002).
- `id` and `createdAt` are server-generated (randomUUID, now) — never supplied by the caller.
- `performedAt` is caller-supplied (records when the audited action occurred, distinct from the persistence timestamp `createdAt`).
- `performedBy`, `ipAddress`, `userAgent`, `oldValues`, and `newValues` are all nullable.

### AuditLogFilters

| Field | Type | Required |
|-------|------|----------|
| entityType | string | false |
| entityId | string | false |
| performedBy | string | false |
| action | string | false |
| performedFrom | Date | false |
| performedTo | Date | false |

## validation

Represents validation data managed by the `validation` module.

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
