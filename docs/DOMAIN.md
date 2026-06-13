# Domain Model — trackeros

To be populated as the design-agent and context-agent learn the domain.

## leave

Represents a leave record managed by the `leave` module, including leave requests and related leave-tracking data.

### LeaveRequest

| Field | Type | Required |
|-------|------|----------|
| id | string | Yes |
| employeeId | string | Yes |
| leaveType | string | Yes |
| startDate | Date | Yes |
| endDate | Date | Yes |
| durationDays | number | Yes |
| reason | string | No |
| status | `DRAFT` \| `SUBMITTED` \| `PENDING_APPROVAL` \| `APPROVED` \| `REJECTED` \| `CANCELLED` | Yes |
| managerId | string | No |
| submittedAt | Date | No |
| reviewedAt | Date | No |
| reviewerComments | string | No |
| createdAt | Date | Yes |
| updatedAt | Date | Yes |

**Relationships**
- Employee (many-to-one)
- LeavePolicy (many-to-one)
- LeaveBalance (many-to-one)

## balance

Represents leave balance data managed by the `balance` module, including tracked entitlement, accrual, and remaining leave amounts.

### LeaveBalance

| Field | Type | Required |
|-------|------|----------|
| id | string | Yes |
| employeeId | string | Yes |
| leaveType | string | Yes |
| entitlementDays | number | Yes |
| usedDays | number | Yes |
| remainingDays | number | Yes |
| accrualRate | number | No |
| accrualFrequency | string | No |
| fiscalYear | number | Yes |
| status | `ACTIVE` \| `ARCHIVED` | Yes |
| createdAt | Date | Yes |
| updatedAt | Date | Yes |

**Relationships**
- Employee (many-to-one)

## employee

Represents employee data managed by the `employee` module, including employee records and related personnel information.

### Employee

| Field | Type | Required |
|-------|------|----------|
| id | string | Yes |
| employeeId | string | Yes |
| firstName | string | Yes |
| lastName | string | Yes |
| email | string | Yes |
| managerId | string | No |
| department | string | No |
| hireDate | Date | Yes |
| employmentStatus | `ACTIVE` \| `INACTIVE` \| `TERMINATED` | Yes |
| createdAt | Date | Yes |
| updatedAt | Date | Yes |

**Relationships**
- LeaveRequest (one-to-many)
- LeaveBalance (one-to-many)

## policy

Represents leave policy data managed by the `policy` module, including policy definitions, rules, and leave entitlement configurations.

### LeavePolicy

| Field | Type | Required |
|-------|------|----------|
| id | string | Yes |
| leaveType | string | Yes |
| entitlementDays | number | Yes |
| accrualMethod | string | No |
| maxAccumulation | number | No |
| advanceLeaveAllowed | boolean | Yes |
| requiresDocumentation | boolean | Yes |
| noticePeriodDays | number | Yes |
| applicableEmploymentTypes | string[] | Yes |
| status | `ACTIVE` \| `INACTIVE` | Yes |
| createdAt | Date | Yes |
| updatedAt | Date | Yes |

**Relationships**
- LeaveRequest (one-to-many)
- LeaveBalance (one-to-many)

## notification

Represents notification data managed by the `notification` module, including notification records, delivery status, and related messaging information.

## audit

Represents audit data managed by the `audit` module, including audit records, change history, and activity tracking information.
