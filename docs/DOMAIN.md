## base

Base entity providing common fields for domain models.

### BaseEntity

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| created_at | Date | true |
| updated_at | Date | true |

## shared — enums

Shared enumerations used across all leave-management modules. Defined in `src/shared/types/leave.types.ts`.

### LeaveStatus

| Value | Description |
|-------|-------------|
| PENDING | Leave request is pending review |
| APPROVED | Leave request has been approved |
| REJECTED | Leave request has been rejected |
| CANCELLED | Leave request has been cancelled |
| IN_PROGRESS | Leave is currently in progress (active) |
| COMPLETED | Leave period has completed |

### EmploymentStatus

| Value | Description |
|-------|-------------|
| ACTIVE | Employee is actively employed |
| INACTIVE | Employee is inactive (e.g. suspended) |
| TERMINATED | Employee has been terminated |
| ON_LEAVE | Employee is currently on leave |

### AuditAction

| Value | Description |
|-------|-------------|
| CREATED | Entity was created |
| UPDATED | Entity was updated |
| DELETED | Entity was deleted |
| APPROVED | Entity was approved |
| REJECTED | Entity was rejected |
| CANCELLED | Entity was cancelled |
| SUBMITTED | Entity was submitted for review |

### NotificationType

| Value | Description |
|-------|-------------|
| LEAVE_REQUEST_SUBMITTED | A leave request was submitted |
| LEAVE_APPROVED | A leave request was approved |
| LEAVE_REJECTED | A leave request was rejected |
| LEAVE_CANCELLED | A leave request was cancelled |
| BALANCE_UPDATED | A leave balance was updated |

### EntityType

| Value | Description |
|-------|-------------|
| EMPLOYEE | Employee entity |
| LEAVE_TYPE | Leave type entity |
| LEAVE_POLICY | Leave policy entity |
| LEAVE_REQUEST | Leave request entity |
| LEAVE_BALANCE | Leave balance entity |
| AUDIT_LOG | Audit log entity |
| NOTIFICATION | Notification entity |

## shared — errors

Domain error classes defined in `src/shared/error.types.ts`.

### NotFoundError

Extends `Error`. Constructor: `(entityName: string, id: string)`.

| Property | Type | Description |
|----------|------|-------------|
| entityName | string | Name of the entity that was not found |
| id | string | ID that was looked up |

### ValidationError

Extends `Error`. Constructor: `(message: string, details?: unknown[])`.

| Property | Type | Description |
|----------|------|-------------|
| message | string | Human-readable validation error message |
| details | unknown[] \| undefined | Optional array of validation failure details |

### ConflictError

Extends `Error`. Constructor: `(message: string)`.

| Property | Type | Description |
|----------|------|-------------|
| message | string | Human-readable conflict description |

### UnauthorizedError

Extends `Error`. Constructor: `(message: string)`.

| Property | Type | Description |
|----------|------|-------------|
| message | string | Human-readable unauthorized access description |

### ForbiddenError

Extends `Error`. Constructor: `(message: string)`.

| Property | Type | Description |
|----------|------|-------------|
| message | string | Human-readable forbidden access description |

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
| employmentStatus | EmploymentStatus | true |
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
| leaveType | string | true |
| entitlementDays | number | true |
| accrualRate | number | false |
| maxAccumulation | number | false |
| minimumNoticeDays | number | false |
| requiresManagerApproval | boolean | true |
| isActive | boolean | true |
| createdAt | Date | true |
| updatedAt | Date | true |

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
| type | NotificationType | true |
| title | string | true |
| message | string | true |
| relatedEntityType | string \| null | false |
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
