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
| leavePolicyId | string | true |
| startDate | Date | true |
| endDate | Date | true |
| reason | string \| undefined | false |
| status | LeaveStatus | true |
| approvedBy | string \| null | false |
| approvedAt | Date \| null | false |
| cancelledAt | Date \| null | false |
| createdAt | Date | true |
| updatedAt | Date | true |

**Invariants**
- Lifecycle: DRAFT → SUBMITTED → (APPROVED | REJECTED); cancellable from SUBMITTED or APPROVED.
- approvedBy and approvedAt must both be null unless status is APPROVED; both must be non-null when APPROVED.
- cancelledAt must be null unless status is CANCELLED.
- startDate must be on or before endDate (full-day granularity).

**Relationships**
- `Employee` — many-to-one (employeeId)
- `LeavePolicy` — many-to-one (leavePolicyId)

### CreateLeaveRequestDto

| Field | Type | Required |
|-------|------|----------|
| employeeId | string | true |
| leavePolicyId | string | true |
| startDate | Date | true |
| endDate | Date | true |
| reason | string \| undefined | false |

### UpdateLeaveRequestDto

| Field | Type | Required |
|-------|------|----------|
| startDate | Date \| undefined | false |
| endDate | Date \| undefined | false |
| reason | string \| undefined | false |
| status | LeaveStatus \| undefined | false |

### LeaveRequestQueryParams

| Field | Type | Required |
|-------|------|----------|
| employeeId | string \| undefined | false |
| status | LeaveStatus \| undefined | false |
| leavePolicyId | string \| undefined | false |
| startDateFrom | Date \| undefined | false |
| startDateTo | Date \| undefined | false |

## balance

Represents leave balance data managed by the `leave-balance` module.

### LeaveBalance

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| employeeId | string | true |
| leavePolicyId | string | true |
| totalEntitlement | number | true |
| usedDays | number | true |
| remainingDays | number | true |
| fiscalYear | number | true |
| status | 'ACTIVE' \| 'EXHAUSTED' \| 'CLOSED' | true |
| createdAt | Date | true |
| updatedAt | Date | true |

**Invariants**
- Lifecycle: ACTIVE → EXHAUSTED → CLOSED.
- Composite uniqueness: at most one row per (employeeId, leavePolicyId, fiscalYear).
- Derived-field consistency: remainingDays MUST equal totalEntitlement - usedDays at all times.
- Once CLOSED, no further mutations to usedDays or remainingDays are permitted.

**Relationships**
- `Employee` — many-to-one (employeeId)
- `LeavePolicy` — many-to-one (leavePolicyId)

## employee

Represents employee data managed by the `employee` module.

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
| terminationDate | Date \| null | false |
| employmentStatus | EmploymentStatus | true |
| createdAt | Date | true |
| updatedAt | Date | true |

**Invariants**
- employeeNumber is unique across all employees.
- email is unique across all employees.
- managerId is a self-referencing FK: null (top-level) or a valid Employee.id.
- terminationDate must be null when employmentStatus is ACTIVE.
- terminationDate must be set when employmentStatus is TERMINATED.

### EmploymentStatus

| Value | Description |
|-------|-------------|
| ACTIVE | Currently employed |
| INACTIVE | Not currently active |
| TERMINATED | Employment ended |

## policy

Represents leave policy data managed by the `leave-policy` module.

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

**Invariants**
- No two active policies may share the same leaveType.
- entitlementDays must be a positive integer.
- accrualRate, maxAccumulation, and minimumNoticeDays are nullable; when non-null they must be non-negative.
- A LeavePolicy is either ACTIVE (isActive: true) or INACTIVE (isActive: false).

## notification

Represents notification data managed by the `notification` module.

### NotificationStatus

| Value | Description |
|-------|-------------|
| PENDING | Notification created but not yet sent |
| SENT | Notification has been delivered |
| READ | Notification has been read by recipient |
| ARCHIVED | Notification has been archived |

### LeaveNotification

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| recipientId | string | true |
| type | 'SUBMITTED' \| 'APPROVED' \| 'REJECTED' \| 'CANCELLED' \| 'BALANCE_LOW' \| 'BALANCE_EXHAUSTED' | true |
| title | string | true |
| message | string | true |
| leaveRequestId | string | true |
| status | NotificationStatus | true |
| createdAt | Date | true |
| readAt | Date \| null | false |

**Invariants**
- Lifecycle: PENDING → SENT → READ → ARCHIVED.
- readAt must be null when status is PENDING or SENT.
- readAt must be a non-null Date when status is READ or ARCHIVED.
- leaveRequestId references a LeaveRequest.id (referential integrity enforced at service/DB layer).

## audit

Represents audit data managed by the `audit` module.

### AuditAction

| Value | Description |
|-------|-------------|
| CREATE | Entity created |
| UPDATE | Entity updated |
| DELETE | Entity deleted |
| APPROVE | Entity approved |
| REJECT | Entity rejected |

### AuditLog

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| entityType | string | true |
| entityId | string | true |
| action | string | true |
| oldValues | Record\<string, unknown\> \| null | false |
| newValues | Record\<string, unknown\> \| null | false |
| performedBy | string \| null | false |
| performedAt | Date | true |
| ipAddress | string \| null | false |
| userAgent | string \| null | false |
| createdAt | Date | true |

**Invariants**
- Immutable — no update or delete lifecycle. Repository exposes only create and read methods.
- Every record references a valid domain entity via composite (entityType, entityId).
- When action is CREATE: oldValues must be null, newValues must be non-null.
- When action is DELETE: oldValues must be non-null, newValues must be null.
- When action is UPDATE: both oldValues and newValues must be non-null.
- Referential integrity enforced at the service/DB layer in later phases.

## validation

Represents validation data.

### ValidationResult

| Field | Type | Required |
|-------|------|----------|
| valid | boolean | true |
| errors | string[] | true |

## system

Represents system-level status information, including health-check and version data.

### SystemStatus

| Field | Type | Required |
|-------|------|----------|
| up | boolean | true |
| version | string | true |
