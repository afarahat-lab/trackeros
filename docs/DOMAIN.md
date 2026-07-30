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
| status | LeaveRequestStatus | true |
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
| leavePolicyId | string | true |
| startDate | string | true |
| endDate | string | true |
| reason | string \| undefined | false |

### UpdateLeaveRequestDto

| Field | Type | Required |
|-------|------|----------|
| status | LeaveRequestStatus \| undefined | false |
| approvedBy | string \| undefined | false |
| reason | string \| undefined | false |

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

## balance

Represents leave balance data managed by the `balance` module, including tracked entitlement, used, and remaining leave amounts per employee, policy, and fiscal year.

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
| status | BalanceStatus | true |
| createdAt | Date | true |
| updatedAt | Date | true |

**Relationships**
- `Employee` — many-to-one (via employeeId)
- `LeavePolicy` — many-to-one (via leavePolicyId)

**Status values** (BalanceStatus enum from `src/shared/types/index.ts`):
- `ACTIVE` — balance is in use
- `EXHAUSTED` — remainingDays is zero
- `FROZEN` — balance is frozen (e.g. employee on long-term leave)
- `CLOSED` — balance is closed (e.g. fiscal year ended)

**Repository operations** (`ILeaveBalanceRepository`):
- `findByEmployeeAndPolicy(employeeId, leavePolicyId)` → `LeaveBalance | null`
- `findByEmployee(employeeId)` → `LeaveBalance[]`
- `create(Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>)` → `LeaveBalance`
- `update(id, Partial<LeaveBalance>)` → `LeaveBalance | null`
- `deductDays(id, days)` → `LeaveBalance | null` — atomic UPDATE decrementing `remainingDays` and incrementing `usedDays` in a single statement with RETURNING

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
| employmentStatus | 'ACTIVE' \| 'INACTIVE' \| 'TERMINATED' | true |
| createdAt | Date | true |
| updatedAt | Date | true |

**Repository operations** (`IEmployeeRepository`):
- `findById(id)` → `Employee | null`
- `findByEmail(email)` → `Employee | null`
- `findAll()` → `Employee[]`
- `create(Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>)` → `Employee`
- `update(id, Partial<Employee>)` → `Employee | null`

**Service operations** (`IEmployeeService`):
- `getById(id)` → `Employee | null`
- `getByEmail(email)` → `Employee | null`
- `getAll()` → `Employee[]`
- `createEmployee(data)` → `Employee`
- `updateEmployee(id, data)` → `Employee | null`

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
| accrualRate | number \| undefined | false |
| maxAccumulation | number \| undefined | false |
| minimumNoticeDays | number \| undefined | false |
| requiresManagerApproval | boolean | true |
| isActive | boolean | true |
| createdAt | Date | true |
| updatedAt | Date | true |

**Repository operations** (`ILeavePolicyRepository`):
- `findById(id)` → `LeavePolicy | null`
- `findByLeaveType(leaveType)` → `LeavePolicy | null`
- `findAllActive()` → `LeavePolicy[]`
- `create(Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>)` → `LeavePolicy`
- `update(id, Partial<LeavePolicy>)` → `LeavePolicy | null`

**HTTP endpoints** (`policyRoutes` registered in `src/app.ts`):
- `GET /policies` — list all active policies
- `GET /policies/:id` — get a single policy by ID
- `GET /policies/type/:leaveType` — get the policy for a specific leave type
- `POST /policies` — create a new leave policy
- `PUT /policies/:id` — update an existing leave policy

## notification

Represents notification data managed by the `notification` module, including notification records, delivery status, and related messaging information.

### Notification

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| recipientId | string | true |
| type | string | true |
| title | string | true |
| message | string | true |
| relatedEntityType | string \| null | false |
| relatedEntityId | string \| null | false |
| status | 'PENDING' \| 'SENT' \| 'READ' \| 'ARCHIVED' | true |
| createdAt | Date | true |
| readAt | Date \| null | false |

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
