## base

Base entity providing common fields for domain models.

### BaseEntity

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| created_at | Date | true |
| updated_at | Date | true |

## leave

Represents leave request data managed by the `leave-request` module.

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
| status | LeaveStatus | true |
| approvedBy | string \| null | false |
| approvedAt | Date \| null | false |
| rejectedBy | string \| null | false |
| rejectedAt | Date \| null | false |
| rejectionReason | string \| undefined | false |
| createdAt | Date | true |
| updatedAt | Date | true |

**Relationships**
- `Employee` — many-to-one
- `LeaveType` — many-to-one

### CreateLeaveRequestDto

| Field | Type | Required |
|-------|------|----------|
| employeeId | string | true |
| leaveTypeId | string | true |
| startDate | Date | true |
| endDate | Date | true |
| reason | string \| undefined | false |
| status | LeaveStatus | false |

### StatusUpdateMetadata

| Field | Type | Required |
|-------|------|----------|
| approvedBy | string \| null | false |
| approvedAt | Date \| null | false |
| rejectedBy | string \| null | false |
| rejectedAt | Date \| null | false |
| rejectionReason | string \| null | false |

### UpdateLeaveRequestDto

| Field | Type | Required |
|-------|------|----------|
| startDate | Date | false |
| endDate | Date | false |
| reason | string | false |
| status | LeaveStatus | false |
| approvedBy | string \| null | false |
| approvedAt | Date \| null | false |
| rejectedBy | string \| null | false |
| rejectedAt | Date \| null | false |
| rejectionReason | string \| null | false |

## balance

Represents leave balance data managed by the `leave-balance` module.

### LeaveBalance

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| employeeId | string | true |
| policyId | string | true |
| totalEntitlement | number | true |
| usedDays | number | true |
| pendingDays | number | true |
| remainingDays | number | true |
| fiscalYear | number | true |
| status | 'ACTIVE' \| 'CLOSED' | true |
| createdAt | Date | true |
| updatedAt | Date | true |

**Relationships**
- `Employee` — many-to-one
- `LeavePolicy` — many-to-one

**Notes**
- `remainingDays` is a computed field: `totalEntitlement - usedDays - pendingDays`. The repository mapper computes it at read time regardless of the stored column value.

### CreateLeaveBalanceDto

| Field | Type | Required |
|-------|------|----------|
| employeeId | string | true |
| policyId | string | true |
| totalEntitlement | number | true |
| usedDays | number | false |
| pendingDays | number | false |
| remainingDays | number | false |
| fiscalYear | number | true |
| status | 'ACTIVE' \| 'CLOSED' | false |

### UpdateLeaveBalanceDto

| Field | Type | Required |
|-------|------|----------|
| totalEntitlement | number | false |
| usedDays | number | false |
| pendingDays | number | false |
| remainingDays | number | false |
| status | 'ACTIVE' \| 'CLOSED' | false |

## policy

Represents leave policy and leave type data managed by the `leave-policy` module.

### LeaveTypeCode

| Value | Description |
|-------|-------------|
| annual | Annual leave |
| sick | Sick leave |
| emergency | Emergency leave |
| unpaid | Unpaid leave |
| maternity | Maternity leave |
| paternity | Paternity leave |

### LeaveType

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| code | LeaveTypeCode | true |
| label | string | true |
| description | string \| undefined | false |
| isActive | boolean | true |
| createdAt | Date | true |
| updatedAt | Date | true |

### CreateLeaveTypeDto

| Field | Type | Required |
|-------|------|----------|
| code | LeaveTypeCode | true |
| label | string | true |
| description | string | false |
| isActive | boolean | false |

### UpdateLeaveTypeDto

| Field | Type | Required |
|-------|------|----------|
| code | LeaveTypeCode | false |
| label | string | false |
| description | string | false |
| isActive | boolean | false |

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

**Relationships**
- `LeaveType` — many-to-one (via leaveTypeId)

### CreateLeavePolicyDto

| Field | Type | Required |
|-------|------|----------|
| policyName | string | true |
| leaveTypeId | string | true |
| entitlementDays | number | true |
| accrualRate | number | false |
| maxAccumulation | number | false |
| minimumNoticeDays | number | false |
| requiresManagerApproval | boolean | false |
| isActive | boolean | false |

### UpdateLeavePolicyDto

| Field | Type | Required |
|-------|------|----------|
| policyName | string | false |
| leaveTypeId | string | false |
| entitlementDays | number | false |
| accrualRate | number | false |
| maxAccumulation | number | false |
| minimumNoticeDays | number | false |
| requiresManagerApproval | boolean | false |
| isActive | boolean | false |

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

### CreateNotificationDto

| Field | Type | Required |
|-------|------|----------|
| recipientId | string | true |
| type | 'LEAVE_SUBMITTED' \| 'LEAVE_APPROVED' \| 'LEAVE_REJECTED' \| 'LEAVE_CANCELLED' | true |
| title | string | true |
| message | string | true |
| relatedEntityType | 'LeaveRequest' | true |
| relatedEntityId | string | true |

**Notes**
- `create` always sets `status` to `'PENDING'` and `read_at` to `NULL` regardless of caller input.
- `markAsSent` and `markAsRead` are idempotent — re-marking an already-SENT or already-READ notification succeeds.
- `createBatch` uses a single multi-row INSERT for fan-out efficiency.

## audit

Represents audit data managed by the `audit` module.

### AuditRecord

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| entityType | string | true |
| entityId | string | true |
| action | string | true |
| performedBy | string | true |
| changes | Record\<string, unknown\> | true |
| createdAt | Date | true |

### CreateAuditRecordDto

| Field | Type | Required |
|-------|------|----------|
| entityType | string | true |
| entityId | string | true |
| action | string | true |
| performedBy | string | true |
| changes | Record\<string, unknown\> | true |

### IAuditRepository

Methods:
- `create(dto: CreateAuditRecordDto): Promise<AuditRecord>`
- `findByEntity(entityType: string, entityId: string): Promise<AuditRecord[]>`
- `findByPerformer(performedBy: string, limit?: number): Promise<AuditRecord[]>`

**Notes**
- The `changes` field is serialized via `JSON.stringify` on write and returned as a parsed `Record<string, unknown>` on read.
- `findByPerformer` supports an optional `limit` parameter for pagination.
- Results are ordered by `created_at DESC`.

## employee

Represents employee data managed by the `employee` module (planned — not yet implemented).

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
