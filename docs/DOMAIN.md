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
| Pending | Leave request is pending review |
| Approved | Leave request has been approved |
| Rejected | Leave request has been rejected |
| Cancelled | Leave request has been cancelled |

### LeaveRequest

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| employeeId | string | true |
| policyId | string | true |
| startDate | Date | true |
| endDate | Date | true |
| totalDays | number | true |
| status | LeaveRequestStatus | true |
| reason | string | true |
| managerId | string \| null | false |
| managerNotes | string \| null | false |
| reviewedAt | Date \| null | false |
| createdAt | Date | true |
| updatedAt | Date | true |
| deletedAt | Date \| null | false |

**Relationships**
- `Employee` — many-to-one
- `LeavePolicy` — many-to-one

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
| status | LeaveRequestStatus | true |
| managerNotes | string | false |

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
| balanceYear | number | true |
| availableDays | number | true |
| usedDays | number | true |
| pendingDays | number | true |
| carriedOverDays | number | true |
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
| maxConsecutiveDays | number | true |
| minNoticeDays | number | true |
| requiresApproval | boolean | true |
| carryOverLimit | number | true |
| validityStart | Date | true |
| validityEnd | Date | true |
| isActive | boolean | true |
| createdAt | Date | true |
| updatedAt | Date | true |
| deletedAt | Date \| null | false |

## notification

Represents notification data managed by the `notification` module, including notification records, delivery status, and related messaging information.

### NotificationType

| Value | Description |
|-------|-------------|
| LEAVE_REQUESTED | A new leave request has been submitted |
| LEAVE_APPROVED | A leave request has been approved |
| LEAVE_REJECTED | A leave request has been rejected |
| LEAVE_CANCELLED | A leave request has been cancelled |
| BALANCE_UPDATED | Leave balance has been updated |
| POLICY_UPDATED | Leave policy has been updated |

### Notification

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| recipientId | string | true |
| senderId | string \| null | false |
| type | NotificationType | true |
| title | string | true |
| body | string | true |
| metadata | Record<string, any> \| null | false |
| isRead | boolean | true |
| readAt | Date \| null | false |
| createdAt | Date | true |

**Relationships**
- `Employee` — many-to-one

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

## error

Represents application error data managed by the `error` module, including error codes, status codes, and diagnostic details.

### ErrorCode

| Value | Description |
|-------|-------------|
| *enum* | Application error codes |

### AppError

| Field | Type | Required |
|-------|------|----------|
| code | ErrorCode | true |
| statusCode | number | true |
| details | Record<string, any> \| null | false |
