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
| leaveTypeId | string | true |
| startDate | Date | true |
| endDate | Date | true |
| reason | string \| null | false |
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

### EmploymentStatus

| Value | Description |
|-------|-------------|
| ACTIVE | Employee is currently active |
| INACTIVE | Employee is inactive |
| TERMINATED | Employee has been terminated |

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

**Relationships**
- `Employee` — many-to-one (self-referencing manager relationship)

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
| leaveType | LeaveType | true |
| entitlementDays | number | true |
| accrualRate | number \| null | false |
| maxAccumulation | number \| null | false |
| minimumNoticeDays | number \| null | false |
| requiresManagerApproval | boolean | true |
| isActive | boolean | true |
| createdAt | Date | true |
| updatedAt | Date | true |

## notification

Represents notification data managed by the `notification` module, including notification records, delivery status, and related messaging information.

### NotificationStatus

| Value | Description |
|-------|-------------|
| PENDING | Notification is pending delivery |
| SENT | Notification has been sent |
| READ | Notification has been read by recipient |
| ARCHIVED | Notification has been archived |

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
| status | NotificationStatus | true |
| createdAt | Date | true |
| readAt | Date \| null | false |

**Relationships**
- `Employee` — many-to-one

## audit

Represents audit data managed by the `audit` module, including audit records, change history, and activity tracking information.

### AuditAction

| Value | Description |
|-------|-------------|
| CREATE | Entity was created |
| UPDATE | Entity was updated |
| DELETE | Entity was deleted |
| APPROVE | Entity was approved |
| REJECT | Entity was rejected |

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
| id | string | true |
| entityType | string | true |
| entityId | string | true |
| action | AuditAction | true |
| oldValues | Record<string, any> \| null | false |
| newValues | Record<string, any> \| null | false |
| performedBy | string \| null | false |
| performedAt | Date | true |
| ipAddress | string \| null | false |
| userAgent | string \| null | false |
| createdAt | Date | true |

**Relationships**
- `Employee` — many-to-one

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
