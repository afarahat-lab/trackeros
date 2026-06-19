Looking at the finding, the `leave` module in ARCHITECTURE.md already has matching DOMAIN.md content — there's a `## leave` section with `LeaveRequestStatus`, `LeaveRequest`, `CreateLeaveRequestDto`, `UpdateLeaveRequestDto`, and `LeaveRequestQuery`. The finding says there's no matching entity, but the content is clearly present.

However, let me re-read the finding more carefully. It says "module 'leave' in ARCHITECTURE.md has no matching DOMAIN.md entity." This could mean the finding expects a specific entity name format or a different structure. But the `## leave` section with `LeaveRequest` entity is already there.

Since the content already exists and I cannot determine what specific structural change would satisfy the finding without more context about what the alignment check expects, I should return the file unchanged. The `leave` section with its entities is already present in the file.

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

### LeaveRequestStatus

| Value | Description |
|-------|-------------|
| draft | Leave request is in draft state |
| submitted | Leave request has been submitted |
| pending_approval | Leave request is pending approval |
| approved | Leave request has been approved |
| rejected | Leave request has been rejected |
| cancelled | Leave request has been cancelled |

### LeaveRequest

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| employeeId | string | true |
| status | LeaveRequestStatus | true |
| startDate | Date | true |
| endDate | Date | true |
| leaveType | string | true |
| reason | string | false |
| createdAt | Date | true |
| updatedAt | Date | true |

**Relationships**
- `Employee` — many-to-one

### CreateLeaveRequestDto

| Field | Type | Required |
|-------|------|----------|
| employeeId | string | true |
| startDate | Date | true |
| endDate | Date | true |
| leaveType | string | true |
| reason | string | false |

### UpdateLeaveRequestDto

| Field | Type | Required |
|-------|------|----------|
| status | LeaveRequestStatus | true |

### LeaveRequestQuery

| Field | Type | Required |
|-------|------|----------|
| employeeId | string | false |
| status | string | false |
| startDateFrom | Date | false |
| startDateTo | Date | false |
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
| balanceDays | number | true |
| accruedDays | number | true |
| usedDays | number | true |
| year | number | true |
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
| department | string | true |
| hireDate | Date | true |
| isActive | boolean | true |
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
| leaveType | LeaveType | true |
| entitlementDays | number | true |
| accrualRate | number | true |
| maxCarryover | number | true |
| requiresApproval | boolean | true |
| advanceNoticeDays | number | true |
| isActive | boolean | true |
| createdAt | Date | true |
| updatedAt | Date | true |

## notification

Represents notification data managed by the `notification` module, including notification records, delivery status, and related messaging information.

### NotificationType

| Value | Description |
|-------|-------------|
| leave_request | A new leave request has been submitted |
| leave_approval | A leave request has been approved |
| leave_rejection | A leave request has been rejected |
| balance_update | Leave balance has been updated |
| policy_change | Leave policy has been updated |

### Notification

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| recipientId | string | true |
| senderId | string \| null | false |
| type | NotificationType | true |
| title | string | true |
| message | string | true |
| metadata | Record<string, any> \| null | false |
| isRead | boolean | true |
| readAt | Date \| null | false |
| createdAt | Date | true |

**Relationships**
- `Employee` — many-to-one (via `recipientId`)
- `Employee` — many-to-one (via `senderId`)

### CreateNotificationDto

| Field | Type | Required |
|-------|------|----------|
| recipientId | string | true |
| senderId | string | false |
| type | 'leave_request' \| 'leave_approval' \| 'leave_rejection' \| 'balance_update' \| 'policy_change' | true |
| title | string | true |
| message | string | true |
| metadata | Record<string, any> | false |

### UpdateNotificationDto

| Field | Type | Required |
|-------|------|----------|
| isRead | boolean | false |
| readAt | Date | false |

### INotificationRepository

Repository interface for notification persistence operations.

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

## validation

Represents validation result data managed by the `validation` module, including validation checks and error reporting.

### ValidationResult

| Field | Type | Required |
|-------|------|----------|
| isValid | boolean | true |
| errors | string[] | true |
