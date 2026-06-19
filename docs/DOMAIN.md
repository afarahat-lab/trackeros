# Domain Model — trackeros

To be populated as the design-agent and context-agent learn the domain.

## base

Base entity providing common fields for domain models.

### BaseEntity

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| created_at | Date | true |
| updated_at | Date | true |

## leave

Represents a leave record managed by the `leave` module, including leave requests and related leave-tracking data.

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
| policyId | string | true |
| startDate | Date | true |
| endDate | Date | true |
| status | 'DRAFT' \| 'SUBMITTED' \| 'APPROVED' \| 'REJECTED' \| 'CANCELLED' | true |
| reason | string | false |
| createdAt | Date | true |
| updatedAt | Date | true |

**Relationships**
- `Employee` — many-to-one
- `LeavePolicy` — many-to-one
- `LeaveBalance` — many-to-one

### CreateLeaveRequestDto

| Field | Type | Required |
|-------|------|----------|
| employeeId | string | true |
| policyId | string | true |
| startDate | Date | true |
| endDate | Date | true |
| reason | string | false |

### UpdateLeaveRequestDto

| Field | Type | Required |
|-------|------|----------|
| startDate | Date | false |
| endDate | Date | false |
| reason | string | false |

### LeaveRequestQueryParams

| Field | Type | Required |
|-------|------|----------|
| status | 'DRAFT' \| 'SUBMITTED' \| 'APPROVED' \| 'REJECTED' \| 'CANCELLED' | false |
| startDateFrom | Date | false |
| startDateTo | Date | false |
| endDateFrom | Date | false |
| endDateTo | Date | false |
| limit | number | false |
| offset | number | false |

## balance

Represents leave balance data managed by the `balance` module, including tracked entitlement, accrual, and remaining leave amounts.

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
| status | string | true |
| createdAt | Date | true |
| updatedAt | Date | true |

**Relationships**
- `Employee` — many-to-one
- `LeavePolicy` — many-to-one

## employee

Represents employee data managed by the `employee` module, including employee records and related personnel information.

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

## policy

Represents leave policy data managed by the `policy` module, including policy definitions, rules, and leave entitlement configurations.

### LeaveType

| Value | Description |
|-------|-------------|
| annual | Annual leave |
| sick | Sick leave |
| emergency | Emergency leave |
| unpaid | Unpaid leave |
| maternity | Maternity leave |
| paternity | Paternity leave |

### LeavePolicy

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| policyName | string | true |
| leaveType | string | true |
| entitlementDays | number | true |
| accrualRate | number | false |
| maxAccumulation | number | false |
| minimumNoticeDays | number | false |
| requiresManagerApproval | boolean | true |
| isActive | boolean | true |
| createdAt | Date | true |
| updatedAt | Date | true |

## notification

Represents notification data managed by the `notification` module, including notification records, delivery status, and related messaging information.

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

Represents audit data managed by the `audit` module, including audit records, change history, and activity tracking information.

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
