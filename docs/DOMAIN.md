# Domain Model — trackeros

To be populated as the design-agent and context-agent learn the domain.

## leave

Represents a leave record managed by the `leave` module, including leave requests and related leave-tracking data.

### LeaveRequest

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| employeeId | string | true |
| leaveType | string | true |
| startDate | Date | true |
| endDate | Date | true |
| durationDays | number | true |
| reason | string | true |
| status | 'DRAFT' \| 'SUBMITTED' \| 'PENDING_APPROVAL' \| 'APPROVED' \| 'REJECTED' \| 'CANCELLED' | true |
| managerId | string | true |
| submittedAt | Date \| null | false |
| decidedAt | Date \| null | false |
| decisionNotes | string \| null | false |
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
| leaveType | string | true |
| startDate | Date | true |
| endDate | Date | true |
| reason | string | true |
| managerId | string | true |

## balance

Represents leave balance data managed by the `balance` module, including tracked entitlement, accrual, and remaining leave amounts.

### LeaveBalance

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| employeeId | string | true |
| leaveType | string | true |
| entitlementDays | number | true |
| usedDays | number | true |
| remainingDays | number | true |
| fiscalYear | number | true |
| status | 'ACTIVE' \| 'ARCHIVED' | true |
| createdAt | Date | true |
| updatedAt | Date | true |

**Relationships**
- `Employee` — many-to-one
- `LeavePolicy` — many-to-one

## employee

Represents employee data managed by the `employee` module, including employee records and related personnel information.

## policy

Represents leave policy data managed by the `policy` module, including policy definitions, rules, and leave entitlement configurations.

### LeavePolicy

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| leaveType | string | true |
| entitlementRules | Record<string, any> | true |
| accrualFrequency | string | true |
| carryOverLimit | number | true |
| advanceNoticeDays | number | true |
| maxConsecutiveDays | number | true |
| requiresManagerApproval | boolean | true |
| validFrom | Date | true |
| validTo | Date | true |
| status | 'DRAFT' \| 'ACTIVE' \| 'EXPIRED' | true |
| createdAt | Date | true |
| updatedAt | Date | true |

## notification

Represents notification data managed by the `notification` module, including notification records, delivery status, and related messaging information.

## audit

Represents audit data managed by the `audit` module, including audit records, change history, and activity tracking information.
