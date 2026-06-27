# Domain — trackeros

This document describes the domain entities, enums, and relationships for the leave management system.

## Shared Types

Shared enums are defined in `src/shared/types/leave.types.ts` and have zero internal dependencies.

### LeaveType

| Value | Description |
|-------|-------------|
| ANNUAL | Annual leave |
| SICK | Sick leave |
| MATERNITY | Maternity leave |
| PATERNITY | Paternity leave |
| UNPAID | Unpaid leave |
| OTHER | Other leave types |

### LeaveStatus

| Value | Description |
|-------|-------------|
| PENDING | Leave request is pending approval |
| APPROVED | Leave request has been approved |
| REJECTED | Leave request has been rejected |
| CANCELLED | Leave request has been cancelled |

### NotificationType

| Value | Description |
|-------|-------------|
| LEAVE_REQUEST_CREATED | Notification when a leave request is created |
| LEAVE_REQUEST_APPROVED | Notification when a leave request is approved |
| LEAVE_REQUEST_REJECTED | Notification when a leave request is rejected |
| LEAVE_REQUEST_CANCELLED | Notification when a leave request is cancelled |
| LEAVE_BALANCE_LOW | Notification when leave balance is low |
| LEAVE_BALANCE_EXPIRING | Notification when leave balance is expiring |

### AuditAction

| Value | Description |
|-------|-------------|
| CREATE | Entity was created |
| UPDATE | Entity was updated |
| DELETE | Entity was deleted |

### EntityType

| Value | Description |
|-------|-------------|
| LEAVE_REQUEST | Leave request entity |
| LEAVE_BALANCE | Leave balance entity |
| LEAVE_POLICY | Leave policy entity |
| EMPLOYEE | Employee entity |
| NOTIFICATION | Notification entity |

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
| status | LeaveStatus | false |
| leaveTypeId | string | false |
| startDateFrom | Date | false |
| startDateTo | Date | false |
| endDateFrom | Date | false |
| endDateTo | Date | false |
| limit | number | false |
| offset | number | false |

## balance

Represents leave balance data managed by the `balance` module, including tracked entitlement, accrual, and remaining leave amounts.

### Balance

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

### Policy

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| policyName | string | true |
| leaveType | LeaveType | true |
| entitlementDays | number | true |
| accrualRate | number | false |
| maxAccumulation | number | false |
| minimumNoticeDays | number | false |
| requiresManagerApproval | boolean | true |
| isActive | boolean | true |
| createdAt | Date | true |
| updatedAt | Date | true |

### LeavePolicy

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| policyName | string | true |
| leaveType | LeaveType | true |
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
| type | NotificationType | true |
| title | string | true |
| message | string | true |
| relatedEntityType | EntityType \| null | false |
| relatedEntityId | string \| null | false |
| status | 'PENDING' \| 'SENT' \| 'READ' \| 'ARCHIVED' | true |
| createdAt | Date | true |
| readAt | Date \| null | false |

## audit

Represents audit data managed by the `audit` module, including audit records, change history, and activity tracking information.

### Audit

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| entityType | EntityType | true |
| entityId | string | true |
| action | AuditAction | true |
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
| entityType | EntityType | true |
| entityId | string | true |
| action | AuditAction | true |
| oldValues | Record<string, any> \| null | false |
| newValues | Record<string, any> \| null | false |
| performedBy | string \| null | false |
| performedAt | Date | true |

### AuditRecord

| Field | Type | Required |
|-------|------|----------|
| entity_type | EntityType | true |
| entity_id | string | true |
| action | AuditAction | true |
| changed_by | string \| null | false |
| old_values | Record<string, any> \| null | false |
| new_values | Record<string, any> \| null | false |
| ip_address | string \| null | false |
| user_agent | string \| null | false |

### AuditServiceInterface

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| action | AuditAction | true |
| resourceType | EntityType | true |
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
