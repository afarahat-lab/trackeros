## base

Base entity providing common fields for domain models.

### BaseEntity

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| created_at | Date | true |
| updated_at | Date | true |

## leave

Represents a leave record managed by the `leave-request` module, including leave requests and related leave-tracking data.

### LeaveStatus

| Value | Description |
|-------|-------------|
| draft | Leave request is in draft state |
| submitted | Leave request has been submitted |
| approved | Leave request has been approved |
| rejected | Leave request has been rejected |
| cancelled | Leave request has been cancelled |

### LeaveRequest

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| employeeId | string | true |
| leaveType | LeaveType | true |
| startDate | Date | true |
| endDate | Date | true |
| reason | string \| undefined | false |
| status | LeaveStatus | true |
| approvedBy | string \| null | false |
| approvedAt | Date \| null | false |
| rejectionReason | string \| undefined | false |
| createdAt | Date | true |
| updatedAt | Date | true |

**Relationships**
- `Employee` — many-to-one

### CreateLeaveRequestDto

| Field | Type | Required |
|-------|------|----------|
| employeeId | string | true |
| leaveType | LeaveType | true |
| startDate | Date | true |
| endDate | Date | true |
| reason | string \| undefined | false |

### ILeaveRequestRepository

Interface for leave request persistence. Methods:
- `findById(id: string): Promise<LeaveRequest | null>`
- `findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>`
- `findByStatus(status: LeaveStatus): Promise<LeaveRequest[]>`
- `findByManagerId(managerId: string): Promise<LeaveRequest[]>`
- `create(request: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveRequest>`
- `update(id: string, data: Partial<LeaveRequest>): Promise<LeaveRequest | null>`
- `updateStatus(id: string, status: LeaveStatus, approvedBy?: string, rejectionReason?: string): Promise<LeaveRequest | null>`

Allowed status transitions: DRAFT→SUBMITTED, SUBMITTED→APPROVED|REJECTED, SUBMITTED|APPROVED→CANCELLED. REJECTED and CANCELLED are terminal.

### ILeaveRequestService

Interface for leave request business logic. Methods:
- `submit(request: CreateLeaveRequestDto): Promise<LeaveRequest>`
- `approve(id: string, approverId: string): Promise<LeaveRequest>`
- `reject(id: string, approverId: string, reason: string): Promise<LeaveRequest>`
- `cancel(id: string, employeeId: string): Promise<LeaveRequest>`
- `getById(id: string): Promise<LeaveRequest | null>`
- `getByEmployee(employeeId: string): Promise<LeaveRequest[]>`
- `getPendingForManager(managerId: string): Promise<LeaveRequest[]>`

### Validation schemas (Zod)

- `createLeaveRequestSchema` — validates CreateLeaveRequestDto; enforces `startDate <= endDate` via `.refine()`
- `updateLeaveRequestSchema` — partial schema for update payloads; all fields optional

### Error classes

- `LeaveRequestNotFoundError` — code: `'NOT_FOUND'`
- `LeaveRequestValidationError` — code: `'VALIDATION_ERROR'`

## balance

Represents leave balance data managed by the `balance` module, including tracked entitlement, accrual, and remaining leave amounts.

### Balance

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| employeeId | string | true |
| leaveType | string | true |
| totalEntitlement | number | true |
| usedDays | number | true |
| remainingDays | number | true |
| fiscalYear | number | true |
| status | BalanceStatus | true |
| createdAt | Date | true |
| updatedAt | Date | true |

**Relationships**
- `Employee` — many-to-one

### IBalanceRepository

Interface for balance persistence. Methods:
- `findByEmployeeId(employeeId: string): Promise<Balance[]>`
- `findByEmployeeIdAndLeaveType(employeeId: string, leaveType: string): Promise<Balance | null>`
- `findByEmployeeIdAndFiscalYear(employeeId: string, fiscalYear: number): Promise<Balance[]>`
- `create(balance: Omit<Balance, 'id' | 'createdAt' | 'updatedAt'>): Promise<Balance>`
- `update(id: string, data: Partial<Balance>): Promise<Balance | null>`
- `deductDays(id: string, days: number): Promise<Balance | null>`

### IBalanceService

Interface for balance business logic. Methods:
- `getBalance(employeeId: string, leaveType: string): Promise<Balance | null>`
- `getBalances(employeeId: string): Promise<Balance[]>`
- `hasSufficientBalance(employeeId: string, leaveType: string, requestedDays: number): Promise<boolean>`
- `deductBalance(employeeId: string, leaveType: string, days: number): Promise<Balance>`

### Error classes

- `InsufficientBalanceError` — code: `'INSUFFICIENT_BALANCE'`
- `BalanceNotFoundError` — code: `'NOT_FOUND'`

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

Represents leave policy data managed by the `leave-policy` module, including policy definitions, rules, and leave entitlement configurations.

### LeavePolicy

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| policyName | string | true |
| leaveType | LeaveType | true |
| entitlementDays | number | true |
| accrualRate | number \| undefined | false |
| maxAccumulation | number \| undefined | false |
| minimumNoticeDays | number | true |
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
| status | NotificationStatus | true |
| createdAt | Date | true |
| readAt | Date \| null | false |

### INotificationRepository

Interface for notification persistence. Methods:
- `findByRecipientId(recipientId: string): Promise<Notification[]>`
- `findByRecipientIdAndStatus(recipientId: string, status: NotificationStatus): Promise<Notification[]>`
- `create(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification>`
- `updateStatus(id: string, status: NotificationStatus, readAt?: Date): Promise<Notification | null>`

### INotificationService

Interface for notification business logic. Methods:
- `notifyLeaveSubmitted(leaveRequest: LeaveRequest): Promise<Notification>`
- `notifyLeaveApproved(leaveRequest: LeaveRequest): Promise<Notification>`
- `notifyLeaveRejected(leaveRequest: LeaveRequest): Promise<Notification>`
- `notifyLeaveCancelled(leaveRequest: LeaveRequest): Promise<Notification>`
- `getNotifications(recipientId: string): Promise<Notification[]>`
- `markAsRead(id: string): Promise<Notification>`

Each `notify*` method sets `relatedEntityType` to `'leave_request'`, `relatedEntityId` to the leave request's id, and `recipientId` to the leave request's employeeId.

### Error classes

- `NotificationNotFoundError` — code: `'NOT_FOUND'`; thrown by `NotificationService.markAsRead` when the notification id is not found

## audit

Represents audit data managed by the `audit-log` module, including audit records, change history, and activity tracking information.

### AuditLog

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| entityType | string | true |
| entityId | string | true |
| action | string | true |
| performedBy | string | true |
| changes | Record<string, unknown> | true |
| createdAt | Date | true |

### IAuditLogRepository

Interface for audit log persistence. Methods:
- `findByEntity(entityType: string, entityId: string): Promise<AuditLog[]>`
- `create(entry: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog>`
- `findAll(filters?: { entityType?: string; performedBy?: string; fromDate?: Date; toDate?: Date }): Promise<AuditLog[]>`

### Error classes

- `AuditLogValidationError` — code: `'VALIDATION_ERROR'`

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
