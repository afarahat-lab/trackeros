## base

Base entity providing common fields for domain models.

### BaseEntity

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| created_at | Date | true |
| updated_at | Date | true |

## shared types — canonical enums

Defined in `src/shared/types/leave.types.ts`. These are the single source of truth for all leave-related enumerations across every module.

### LeaveType

String enum (e.g. `ANNUAL = 'ANNUAL'`).

| Value | Description |
|-------|-------------|
| ANNUAL | Annual leave |
| SICK | Sick leave |
| MATERNITY | Maternity leave |
| PATERNITY | Paternity leave |
| UNPAID | Unpaid leave |
| OTHER | Other leave type |

### LeaveStatus

String enum (e.g. `PENDING = 'PENDING'`).

| Value | Description |
|-------|-------------|
| PENDING | Leave request is pending review |
| APPROVED | Leave request has been approved |
| REJECTED | Leave request has been rejected |
| CANCELLED | Leave request has been cancelled |

### NotificationType

String enum (e.g. `LEAVE_REQUEST_CREATED = 'LEAVE_REQUEST_CREATED'`).

| Value | Description |
|-------|-------------|
| LEAVE_REQUEST_CREATED | A new leave request was submitted |
| LEAVE_REQUEST_APPROVED | A leave request was approved |
| LEAVE_REQUEST_REJECTED | A leave request was rejected |
| LEAVE_REQUEST_CANCELLED | A leave request was cancelled |
| LEAVE_BALANCE_LOW | Employee leave balance fell below threshold |
| LEAVE_BALANCE_EXPIRING | Employee leave balance is about to expire |

### AuditAction

String enum (e.g. `CREATE = 'CREATE'`).

| Value | Description |
|-------|-------------|
| CREATE | Entity was created |
| UPDATE | Entity was updated |
| DELETE | Entity was deleted |

### EntityType

String enum (e.g. `LEAVE_REQUEST = 'LEAVE_REQUEST'`).

| Value | Description |
|-------|-------------|
| LEAVE_REQUEST | A leave request entity |
| LEAVE_BALANCE | A leave balance entity |
| LEAVE_POLICY | A leave policy entity |
| EMPLOYEE | An employee entity |
| NOTIFICATION | A notification entity |

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

### LeaveBalance

Defined in `src/modules/balance/balance.model.ts`.

| Field | Type | Required |
|-------|------|----------|
| id | number | true |
| employeeId | number | true |
| policyId | number | true |
| totalEntitlement | number | true |
| usedDays | number | true |
| pendingDays | number | true |
| availableDays | number | true |
| fiscalYear | number | true |
| createdAt | Date | true |
| updatedAt | Date | true |

**Relationships**
- `Employee` — many-to-one
- `LeavePolicy` — many-to-one

### LeaveBalanceQueryParams

Defined in `src/modules/balance/balance.model.ts`. Optional filter parameters for querying balances.

| Field | Type | Required |
|-------|------|----------|
| employeeId | number | false |
| policyId | number | false |
| fiscalYear | number | false |

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

### LeavePolicy

Defined in `src/modules/policy/policy.model.ts`.

| Field | Type | Required |
|-------|------|----------|
| id | number | true |
| policyName | string | true |
| leaveType | LeaveType | true |
| entitlementDays | number | true |
| accrualRate | number | true |
| maxAccumulation | number | true |
| minimumNoticeDays | number | true |
| requiresManagerApproval | boolean | true |
| isActive | boolean | true |
| allowNegativeBalance | boolean | true |
| maxConsecutiveDays | number | true |
| fiscalYear | number | true |
| createdAt | Date | true |
| updatedAt | Date | true |

### LeavePolicyQueryParams

Defined in `src/modules/policy/policy.model.ts`. Optional filter parameters for querying policies.

| Field | Type | Required |
|-------|------|----------|
| leaveType | LeaveType | false |
| isActive | boolean | false |
| fiscalYear | number | false |

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
