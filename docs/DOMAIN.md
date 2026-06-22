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
| reason | string | false |
| status | LeaveRequestStatus | true |
| approverId | string | false |
| approverComment | string | false |
| approvedAt | Date | false |
| createdAt | Date | true |
| updatedAt | Date | true |

**Relationships**
- `Employee` — many-to-one (employeeId → Employee)
- `LeaveType` — many-to-one (leaveTypeId → LeaveType)
- `Employee` — many-to-one (approverId → Employee)

### CreateLeaveRequestDto

| Field | Type | Required |
|-------|------|----------|
| employeeId | string | true |
| leaveTypeId | string | true |
| startDate | Date | true |
| endDate | Date | true |
| reason | string | false |

### UpdateLeaveRequestDto

| Field | Type | Required |
|-------|------|----------|
| startDate | Date | false |
| endDate | Date | false |
| reason | string | false |

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

### POST /api/leave/submit

Submit a new leave request.

| Field | Type | Required |
|-------|------|----------|
| authRequired | boolean | true |
| roles | string[] | true |

**Request Body**

| Field | Type | Required |
|-------|------|----------|
| leaveTypeId | string (UUID) | true |
| startDate | string (ISO date) | true |
| endDate | string (ISO date) | true |
| reason | string | false |

**Response Body**

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| employeeId | string | true |
| leaveTypeId | string | true |
| startDate | string | true |
| endDate | string | true |
| reason | string \| null | true |
| status | string | true |
| managerComment | string \| null | true |
| createdAt | string | true |
| updatedAt | string | true |

### PUT /api/leave/approve/:id

Approve a pending leave request.

| Field | Type | Required |
|-------|------|----------|
| authRequired | boolean | true |
| roles | string[] | true |

**Request Body**

| Field | Type | Required |
|-------|------|----------|
| comment | string | false |

**Response Body**

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| employeeId | string | true |
| leaveTypeId | string | true |
| startDate | string | true |
| endDate | string | true |
| reason | string \| null | true |
| status | string | true |
| managerComment | string \| null | true |
| createdAt | string | true |
| updatedAt | string | true |

### PUT /api/leave/reject/:id

Reject a pending leave request.

| Field | Type | Required |
|-------|------|----------|
| authRequired | boolean | true |
| roles | string[] | true |

**Request Body**

| Field | Type | Required |
|-------|------|----------|
| comment | string | false |

**Response Body**

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| employeeId | string | true |
| leaveTypeId | string | true |
| startDate | string | true |
| endDate | string | true |
| reason | string \| null | true |
| status | string | true |
| managerComment | string \| null | true |
| createdAt | string | true |
| updatedAt | string | true |

### PUT /api/leave/cancel/:id

Cancel an approved or pending leave request.

| Field | Type | Required |
|-------|------|----------|
| authRequired | boolean | true |
| roles | string[] | true |

**Request Body**

No request body required.

**Response Body**

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| employeeId | string | true |
| leaveTypeId | string | true |
| startDate | string | true |
| endDate | string | true |
| reason | string \| null | true |
| status | string | true |
| managerComment | string \| null | true |
| createdAt | string | true |
| updatedAt | string | true |

### DELETE /api/leave/discard-draft/:id

Discard a draft leave request.

| Field | Type | Required |
|-------|------|----------|
| authRequired | boolean | true |
| roles | string[] | true |

**Request Body**

No request body required.

**Response Body**

No response body returned.

### GET /api/leave/balances

Get leave balances for the authenticated employee.

| Field | Type | Required |
|-------|------|----------|
| authRequired | boolean | true |
| roles | string[] | true |

**Request Body**

No request body required.

**Response Body**

| Field | Type | Required |
|-------|------|----------|
| leaveTypeId | string | true |
| balance | number | true |
| year | number | true |

### GET /api/leave/history

Get leave request history for the authenticated employee.

| Field | Type | Required |
|-------|------|----------|
| authRequired | boolean | true |
| roles | string[] | true |

**Request Body**

No request body required.

**Response Body**

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| employeeId | string | true |
| leaveTypeId | string | true |
| startDate | string | true |
| endDate | string | true |
| reason | string \| null | true |
| status | string | true |
| managerComment | string \| null | true |
| createdAt | string | true |
| updatedAt | string | true |

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
| leaveTypeId | string | true |
| totalEntitlement | number | true |
| usedDays | number | true |
| pendingDays | number | true |
| year | number | true |
| createdAt | Date | true |
| updatedAt | Date | true |

**Relationships**
- `Employee` — many-to-one
- `LeaveType` — many-to-one

## employee

Represents employee data managed by the `employee` module, including employee records and related personnel information.

### Employee

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| firstName | string | true |
| lastName | string | true |
| email | string | true |
| managerId | string \| null | true |
| role | string | true |
| department | string \| null | true |
| createdAt | Date | true |
| updatedAt | Date | true |

**Relationships**
- `Employee` — one-to-many (self-referencing, manager → subordinates)

## leavetype

Represents leave type definitions managed by the `leavetype` module, including leave type records and related configuration.

### LeaveType

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| name | string | true |
| description | string \| null | false |
| requiresDocumentation | boolean | true |
| createdAt | Date | true |

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
| leaveTypeId | string | true |
| maxDaysPerYear | number | true |
| maxConsecutiveDays | number \| null | false |
| requiresApproval | boolean | true |
| minNoticeDays | number | true |
| createdAt | Date | true |
| updatedAt | Date | true |

**Relationships**
- `LeaveType` — one-to-one

## notification

Represents notification data managed by the `notification` module, including notification records, delivery status, and related messaging information.

### NotificationType

| Value | Description |
|-------|-------------|
| LEAVE_APPROVED | Leave request has been approved |
| LEAVE_REJECTED | Leave request has been rejected |
| LEAVE_CANCELLED | Leave request has been cancelled |

### Notification

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| recipientId | string | true |
| leaveRequestId | string | true |
| type | NotificationType | true |
| message | string | true |
| isRead | boolean | true |
| createdAt | Date | true |

**Relationships**
- `Employee` — many-to-one
- `LeaveRequest` — many-to-one

## audit

Represents audit data managed by the `audit` module, including audit records, change history, and activity tracking information.

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
| action | string | true |
| changedBy | string | true |
| oldValues | Record<string, unknown> \| null | true |
| newValues | Record<string, unknown> \| null | true |
| createdAt | Date | true |

**Relationships**
- `Employee` — many-to-one

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

Represents validation data managed by the `validation` module, including validation results and related error information.

### ValidationResult

| Field | Type | Required |
|-------|------|----------|
| isValid | boolean | true |
| errors | string[] | true |

## user

Represents user authentication data managed by the `user` module, including login credentials and role assignments for platform access.

### User

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| username | string | true |
| passwordHash | string | true |
| employeeId | string | true |
| role | 'employee' \| 'manager' | true |

**Relationships**
- `Employee` — one-to-one (employeeId → Employee)

## auth

Represents authentication API contracts managed by the `auth` module, including login and logout endpoints.

### POST /api/auth/login

Authenticates user with username and password, returns a JWT token.

| Field | Type | Required |
|-------|------|----------|
| authRequired | boolean | false |
| roles | string[] | false |

**Request Body**

| Field | Type | Required |
|-------|------|----------|
| username | string | true |
| password | string | true |

**Response Body**

| Field | Type | Required |
|-------|------|----------|
| token | string | true |

### POST /api/auth/logout

Logs out the authenticated user (stateless, client discards token).

| Field | Type | Required |
|-------|------|----------|
| authRequired | boolean | true |
| roles | string[] | false |

**Request Body**

No request body required.

**Response Body**

| Field | Type | Required |
|-------|------|----------|
| message | string | true |
