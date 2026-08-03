## base

Base entity providing common fields for domain models.

### BaseEntity

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| createdAt | Date | true |
| updatedAt | Date | true |

## leave

Represents a leave record managed by the `leave` module, including leave requests and related leave-tracking data.

### LeaveRequestStatus

| Value | Description |
|-------|-------------|
| DRAFT | Leave request is in draft state |
| SUBMITTED | Leave request has been submitted |
| APPROVED | Leave request has been approved |
| REJECTED | Leave request has been rejected |
| CANCELLED | Leave request has been cancelled |

### LeaveType

| Value | Description |
|-------|-------------|
| ANNUAL | Annual leave |
| SICK | Sick leave |
| EMERGENCY | Emergency leave |
| UNPAID | Unpaid leave |
| MATERNITY | Maternity leave |
| PATERNITY | Paternity leave |

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
| status | LeaveRequestStatus | false |
| rejectionReason | string | false |

### LeaveRequest

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| employeeId | string | true |
| leavePolicyId | string | true |
| startDate | Date | true |
| endDate | Date | true |
| reason | string \| undefined | false |
| status | LeaveRequestStatus | true |
| approvedBy | string \| null | false |
| approvedAt | Date \| null | false |
| rejectedBy | string \| null | false |
| rejectedAt | Date \| null | false |
| rejectionReason | string \| null | false |
| cancelledBy | string \| null | false |
| cancelledAt | Date \| null | false |
| createdAt | Date | true |
| updatedAt | Date | true |

### ActorRole

| Value | Description |
|-------|-------------|
| employee | Standard employee — may submit/cancel own requests |
| manager | Manager — may approve/reject direct reports' requests |
| hr_admin | HR administrator — may approve/reject any request |

### ILeaveRequestService

| Method | Signature |
|--------|-----------|
| submitDraft | `(leaveRequestId: string, actorId: string): Promise<LeaveRequest>` |
| approve | `(leaveRequestId: string, approverId: string, approverRole: ActorRole): Promise<LeaveRequest>` |
| reject | `(leaveRequestId: string, rejectorId: string, rejectorRole: ActorRole, reason: string): Promise<LeaveRequest>` |
| cancel | `(leaveRequestId: string, actorId: string): Promise<LeaveRequest>` |
| createDraft | `(dto: CreateLeaveRequestDto): Promise<LeaveRequest>` |
| findById | `(id: string): Promise<LeaveRequest \| null>` |
| findByEmployee | `(employeeId: string): Promise<LeaveRequest[]>` |

## shared/utils

### countBusinessDays

`countBusinessDays(startDate: Date, endDate: Date, holidays: Date[]): number`

Counts business days (Mon–Fri) in the inclusive range `[startDate, endDate]`, excluding weekends and the provided holidays array. Returns 0 when `startDate > endDate`.

**Implementation note (divergence from UTC spec):** The current implementation uses local-time getters (`getDay()`, `getFullYear()`, `getMonth()`, `getDate()`, `setHours()`) for date comparison and weekend detection. The clarification spec mandates UTC-based comparison (using `getUTCDay()`, `getUTCFullYear()`, etc., and normalizing to UTC midnight). Holiday comparison uses `isSameDay()` which compares local date components rather than `YYYY-MM-DD` string equality against a `Set<string>`. This will be corrected in a future phase.

## balance

Represents leave balance data managed by the `balance` module. Tracks entitlement, used days, and fiscal-year balances per employee per policy.

### LeaveBalanceStatus

| Value | Description |
|-------|-------------|
| ACTIVE | Balance has remaining days available |
| EXHAUSTED | Balance has zero remaining days |
| CLOSED | Balance is closed (e.g. fiscal year ended) |

### LeaveBalance

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| employeeId | string | true |
| leavePolicyId | string | true |
| totalEntitlement | number | true |
| usedDays | number | true |
| fiscalYear | number | true |
| status | LeaveBalanceStatus | true |
| createdAt | Date | true |
| updatedAt | Date | true |

**Relationships**
- `Employee` — many-to-one (via `employeeId`)
- `LeavePolicy` — many-to-one (via `leavePolicyId`)

### LeaveBalanceWithRemaining

Extends `LeaveBalance` with a computed field. All repository methods return this type.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| (all LeaveBalance fields) | — | — | — |
| remainingDays | number | true | Computed at query time as `totalEntitlement - usedDays`. Never stored in the database. |

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
| terminationDate | Date \| null | false |
| employmentStatus | string | true |
| createdAt | Date | true |
| updatedAt | Date | true |

## policy

Represents leave policy data managed by the `policy` module, including policy definitions, rules, and leave entitlement configurations.

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

Represents notification data managed by the `notification` module. Notifications are a best-effort side effect — failures are logged but never propagated to the caller.

### NotificationStatus

| Value | Description |
|-------|-------------|
| PENDING | Notification created, not yet sent |
| SENT | Notification successfully sent |
| FAILED | Notification delivery failed |

### Notification

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| recipientId | string | true |
| recipientEmail | string | true |
| subject | string | true |
| body | string | true |
| sentAt | Date \| null | false |
| status | NotificationStatus | true |
| createdAt | Date | true |
| updatedAt | Date | true |

### INotificationService

| Method | Signature |
|--------|-----------|
| notifyLeaveSubmitted | `(employeeId: string, leaveRequestId: string): Promise<void>` |
| notifyLeaveStatusChange | `(employeeId: string, leaveRequestId: string, oldStatus: string, newStatus: string): Promise<void>` |

## audit

Represents audit data managed by the `audit` module. Audit entries are immutable — once written, they are never modified.

### AuditLog

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| actorId | string | true |
| action | string | true |
| targetId | string | true |
| targetType | string | true |
| details | Record<string, unknown> \| null | false |
| timestamp | Date | true |
| createdAt | Date | true |
| updatedAt | Date | true |

**Common action values:** `LEAVE_DRAFT_CREATED`, `LEAVE_SUBMITTED`, `LEAVE_APPROVED`, `LEAVE_REJECTED`, `LEAVE_CANCELLED`

**Note:** `timestamp` records when the audited action occurred (set by the caller), while `createdAt` records when the audit row was inserted. This allows the audit trail to faithfully record action timing even if the audit write is slightly delayed.

## holidays

Holiday reference data consumed by the leave service for business-day counting. Holidays are reference/lookup data, not domain entities — they do not extend `BaseEntity`.

### Holiday

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| date | Date | true |
| name | string | true |
| country | string | true |

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
