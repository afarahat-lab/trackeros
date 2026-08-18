## base

Base entity providing common fields for domain models.

### BaseEntity

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| createdAt | Date | true |
| updatedAt | Date | true |

## shared types

Shared enums used across domain modules.

### LeaveRequestStatus

| Value | Description |
|-------|-------------|
| DRAFT | Leave request is in draft state |
| SUBMITTED | Leave request has been submitted |
| APPROVED | Leave request has been approved |
| REJECTED | Leave request has been rejected |
| CANCELLED | Leave request has been cancelled |

### LeaveType

| Value | Description |
|-------|-------------|
| annual | Annual leave |
| sick | Sick leave |
| emergency | Emergency leave |
| unpaid | Unpaid leave |
| maternity | Maternity leave |
| paternity | Paternity leave |

### BalanceStatus

| Value | Description |
|-------|-------------|
| ACTIVE | Balance is active |
| EXHAUSTED | Balance has no remaining days |
| CLOSED | Balance closed (fiscal year end) |

### EmploymentStatus

| Value | Description |
|-------|-------------|
| ACTIVE | Employee is active |
| INACTIVE | Employee is inactive |
| TERMINATED | Employee has been terminated |

## audit

Audit records track all state-changing operations (GP-002).

### AuditRecord

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| entityType | string | true |
| entityId | string | true |
| action | string | true |
| oldValues | Record\<string, unknown\> \| null | false |
| newValues | Record\<string, unknown\> \| null | false |
| performedBy | string | true |
| performedAt | Date | true |
| ipAddress | string \| undefined | false |
| userAgent | string \| undefined | false |
| createdAt | Date | true |

### IAuditRepository

| Method | Signature |
|--------|-----------|
| create | `(record: AuditRecord) => Promise<AuditRecord>` |
| findByEntity | `(entityType: string, entityId: string) => Promise<AuditRecord[]>` |

### IAuditService

| Method | Signature |
|--------|-----------|
| record | `(params: { entityType, entityId, action, oldValues?, newValues?, performedBy, ipAddress?, userAgent? }) => Promise<AuditRecord>` |

## leave (planned)

Represents a leave record managed by the `leave` module, including leave requests and related leave-tracking data.

### LeaveRequest

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| employeeId | string | true |
| leavePolicyId | string | true |
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
- `LeavePolicy` — many-to-one

### CreateLeaveRequestDto

| Field | Type | Required |
|-------|------|----------|
| employeeId | string | true |
| leavePolicyId | string | true |
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
| employeeId | string | false |
| status | LeaveRequestStatus | false |
| startDate | Date | false |
| endDate | Date | false |

## balance (planned)

Represents leave balance data managed by the `leave-balance` module.

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
| status | BalanceStatus | true |
| createdAt | Date | true |
| updatedAt | Date | true |

**Relationships**
- `Employee` — many-to-one
- `LeavePolicy` — many-to-one

## employee (planned)

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
| department | string | true |
| hireDate | Date | true |
| terminationDate | Date \| null | false |
| employmentStatus | EmploymentStatus | true |
| createdAt | Date | true |
| updatedAt | Date | true |
| deletedAt | Date \| null | false |

## policy (planned)

Represents leave policy data managed by the `leave-policy` module.

### LeavePolicy

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| policyName | string | true |
| leaveType | LeaveType | true |
| entitlementDays | number | true |
| accrualRate | number \| null | false |
| maxAccumulation | number \| null | false |
| minimumNoticeDays | number \| null | false |
| requiresManagerApproval | boolean | true |
| isActive | boolean | true |
| createdAt | Date | true |
| updatedAt | Date | true |

## notification (planned)

Represents notification data managed by the `notification` module.

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

## system

Represents system-level status information, including health-check and version data.

### SystemStatus

| Field | Type | Required |
|-------|------|----------|
| up | boolean | true |
| version | string | true |

### UptimeStatus

| Field | Type | Required |
|-------|------|----------|
| uptimeSeconds | number | true |
