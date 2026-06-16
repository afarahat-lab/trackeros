# Domain Model — trackeros

To be populated as the design-agent and context-agent learn the domain.

## leave

Represents a leave record managed by the `leave` module, including leave requests and related leave-tracking data.

### LeaveRequest

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| employeeId | string | true |
| policyId | string | true |
| startDate | Date | true |
| endDate | Date | true |
| totalDays | number | true |
| status | 'PENDING' \| 'APPROVED' \| 'REJECTED' \| 'CANCELLED' | true |
| reason | string \| null | false |
| managerId | string \| null | false |
| approvedAt | Date \| null | false |
| rejectedAt | Date \| null | false |
| rejectionReason | string \| null | false |
| createdAt | Date | true |
| updatedAt | Date | true |

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
| totalDays | number | true |
| reason | string \| null | false |

## balance

Represents leave balance data managed by the `balance` module, including tracked entitlement, accrual, and remaining leave amounts.

### LeaveBalance

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| employeeId | string | true |
| policyId | string | true |
| balanceDays | number | true |
| fiscalYear | number | true |
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
| phone | string | false |
| department | string | false |
| position | string | false |
| hireDate | Date | false |
| managerId | string \| null | false |
| isActive | boolean | true |
| createdAt | Date | true |
| updatedAt | Date | true |

**Relationships**
- `Employee` — one-to-many

### CreateEmployeeDto

| Field | Type | Required |
|-------|------|----------|
| employeeNumber | string | true |
| firstName | string | true |
| lastName | string | true |
| email | string | true |
| phone | string | false |
| department | string | false |
| position | string | false |
| hireDate | Date | false |
| managerId | string \| null | false |

## policy

Represents leave policy data managed by the `policy` module, including policy definitions, rules, and leave entitlement configurations.

### LeavePolicy

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| policyName | string | true |
| leaveType | 'ANNUAL' \| 'SICK' \| 'EMERGENCY' \| 'UNPAID' | true |
| entitlementDays | number | true |
| accrualRate | number \| null | false |
| maxCarryover | number \| null | false |
| requiresApproval | boolean | true |
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
| body | string | true |
| relatedEntityType | string | true |
| relatedEntityId | string | true |
| status | 'PENDING' \| 'SENT' \| 'READ' \| 'ARCHIVED' | true |
| createdAt | Date | true |
| updatedAt | Date | true |

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
