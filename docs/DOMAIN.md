## shared/types

Shared enums used across all modules. Phase 1 ✅.

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

### AuditAction

| Value | Description |
|-------|-------------|
| CREATED | Entity was created |
| UPDATED | Entity was updated |
| APPROVED | Entity was approved |
| REJECTED | Entity was rejected |
| CANCELLED | Entity was cancelled |
| DELETED | Entity was deleted |

## employee

Employee module. Phase 2 ✅.

### Employee

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| fullName | string | true |
| email | string | true |
| department | string \| null | false |
| managerId | string \| null | false |
| isActive | boolean | true |
| createdAt | Date | true |
| updatedAt | Date | true |

### CreateEmployeeDto

| Field | Type | Required |
|-------|------|----------|
| fullName | string | true |
| email | string | true |
| department | string \| null | false |
| managerId | string \| null | false |

### UpdateEmployeeDto

| Field | Type | Required |
|-------|------|----------|
| fullName | string | false |
| email | string | false |
| department | string \| null | false |
| managerId | string \| null | false |

### IEmployeeRepository

| Method | Signature |
|--------|-----------|
| findById | `(id: string) => Promise<Employee \| null>` |
| findAll | `() => Promise<Employee[]>` |
| findByManager | `(managerId: string) => Promise<Employee[]>` |
| create | `(employee: Omit<Employee, 'id' \| 'createdAt' \| 'updatedAt'>) => Promise<Employee>` |
| update | `(id: string, data: Partial<Employee>) => Promise<Employee \| null>` |
| delete | `(id: string) => Promise<boolean>` |

### IEmployeeService

| Method | Signature |
|--------|-----------|
| getById | `(id: string) => Promise<Employee \| null>` |
| getAll | `() => Promise<Employee[]>` |
| getSubordinates | `(managerId: string) => Promise<Employee[]>` |
| create | `(data: CreateEmployeeDto) => Promise<Employee>` |
| update | `(id: string, data: UpdateEmployeeDto) => Promise<Employee \| null>` |
| deactivate | `(id: string) => Promise<boolean>` |

### Validation rules

- `fullName`: required, non-empty after trim
- `email`: required, non-empty, must match `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- `department`: optional, defaults to `null`
- `managerId`: optional, defaults to `null`
- `isActive`: always set to `true` on create
- `deactivate`: idempotent — returns `true` if already inactive, `false` if employee not found

## audit

Audit module. Phase 3 ✅.

### AuditRecord

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| entityType | string | true |
| entityId | string | true |
| action | AuditAction | true |
| performedBy | string | true |
| changes | Record\<string, unknown\> \| null | false |
| timestamp | Date | true |
| createdAt | Date | true |

### CreateAuditRecordDto

| Field | Type | Required |
|-------|------|----------|
| entityType | string | true |
| entityId | string | true |
| action | AuditAction | true |
| performedBy | string | true |
| changes | Record\<string, unknown\> \| null | false |

### IAuditRepository

| Method | Signature |
|--------|-----------|
| create | `(record: Omit<AuditRecord, 'id' \| 'createdAt'>) => Promise<AuditRecord>` |
| findByEntity | `(entityType: string, entityId: string) => Promise<AuditRecord[]>` |
| findByUser | `(performedBy: string) => Promise<AuditRecord[]>` |
| findByDateRange | `(start: Date, end: Date) => Promise<AuditRecord[]>` |

### IAuditService

| Method | Signature |
|--------|-----------|
| log | `(record: CreateAuditRecordDto) => Promise<AuditRecord>` |
| getEntityHistory | `(entityType: string, entityId: string) => Promise<AuditRecord[]>` |
| getUserActions | `(performedBy: string) => Promise<AuditRecord[]>` |
| getByDateRange | `(start: Date, end: Date) => Promise<AuditRecord[]>` |

### Validation rules

- `entityType`: required, non-empty after trim
- `entityId`: required, non-empty after trim
- `action`: required, must be a valid `AuditAction` enum value
- `performedBy`: required, non-empty after trim
- `changes`: optional, defaults to `null` when not provided
- `timestamp`: auto-set to `new Date()` at log time
- All string fields are trimmed before storage
- Throws `ValidationError` (exported from audit.service.ts) on invalid input

## policy

Policy module. Phase 4 ✅.

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

### CreateLeavePolicyDto

| Field | Type | Required |
|-------|------|----------|
| policyName | string | true |
| leaveType | LeaveType | true |
| entitlementDays | number | true |
| accrualRate | number \| null | false |
| maxAccumulation | number \| null | false |
| minimumNoticeDays | number \| null | false |
| requiresManagerApproval | boolean | false |

### UpdateLeavePolicyDto

| Field | Type | Required |
|-------|------|----------|
| policyName | string | false |
| leaveType | LeaveType | false |
| entitlementDays | number | false |
| accrualRate | number \| null | false |
| maxAccumulation | number \| null | false |
| minimumNoticeDays | number \| null | false |
| requiresManagerApproval | boolean | false |
| isActive | boolean | false |

### ILeavePolicyRepository

| Method | Signature |
|--------|-----------|
| findById | `(id: string) => Promise<LeavePolicy \| null>` |
| findAll | `() => Promise<LeavePolicy[]>` |
| findByLeaveType | `(leaveType: LeaveType) => Promise<LeavePolicy[]>` |
| findActive | `() => Promise<LeavePolicy[]>` |
| create | `(policy: Omit<LeavePolicy, 'id' \| 'createdAt' \| 'updatedAt'>) => Promise<LeavePolicy>` |
| update | `(id: string, data: Partial<LeavePolicy>) => Promise<LeavePolicy \| null>` |
| delete | `(id: string) => Promise<boolean>` |

### ILeavePolicyService

| Method | Signature |
|--------|-----------|
| getById | `(id: string) => Promise<LeavePolicy \| null>` |
| getAll | `() => Promise<LeavePolicy[]>` |
| getByLeaveType | `(leaveType: LeaveType) => Promise<LeavePolicy[]>` |
| getActive | `() => Promise<LeavePolicy[]>` |
| create | `(data: CreateLeavePolicyDto) => Promise<LeavePolicy>` |
| update | `(id: string, data: UpdateLeavePolicyDto) => Promise<LeavePolicy \| null>` |
| deactivate | `(id: string) => Promise<boolean>` |

### Validation rules

- `policyName`: required, non-empty after trim
- `leaveType`: required, must be a valid `LeaveType` enum value
- `entitlementDays`: required, must be a positive finite number (> 0)
- `accrualRate`, `maxAccumulation`, `minimumNoticeDays`: optional, default to `null` when not provided
- `requiresManagerApproval`: optional on create, defaults to `true`
- `isActive`: always set to `true` on create; toggled to `false` on deactivate
- `deactivate`: idempotent — returns `true` if already inactive, `false` if policy not found
- `update`: returns `null` if policy not found; validates leaveType and entitlementDays if provided
- Throws `ValidationError` (exported from policy.service.ts) on invalid input

### Entity invariants

- `leaveType` must be a valid `LeaveType` enum value
- `entitlementDays` must be a positive integer (> 0)
- `accrualRate`, `maxAccumulation`, `minimumNoticeDays` are nullable; when non-null they must be non-negative numbers
- `requiresManagerApproval` and `isActive` are required booleans
- Lifecycle: ACTIVE when `isActive === true`, INACTIVE when `isActive === false`

## balance

Balance module. Phase 5 ✅.

### BalanceStatus

| Value | Description |
|-------|-------------|
| ACTIVE | Balance is available for deductions |
| EXHAUSTED | Balance has zero remaining days |
| CLOSED | Balance is permanently closed (no deductions or restorations) |

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

### CreateBalanceDto

| Field | Type | Required |
|-------|------|----------|
| employeeId | string | true |
| leavePolicyId | string | true |
| totalEntitlement | number | true |
| fiscalYear | number | true |

### IBalanceRepository

| Method | Signature |
|--------|-----------|
| findById | `(id: string) => Promise<LeaveBalance \| null>` |
| findByEmployee | `(employeeId: string) => Promise<LeaveBalance[]>` |
| findByEmployeeAndPolicy | `(employeeId: string, leavePolicyId: string) => Promise<LeaveBalance \| null>` |
| findByEmployeeAndFiscalYear | `(employeeId: string, fiscalYear: number) => Promise<LeaveBalance[]>` |
| create | `(balance: Omit<LeaveBalance, 'id' \| 'createdAt' \| 'updatedAt'>) => Promise<LeaveBalance>` |
| update | `(id: string, data: Partial<LeaveBalance>) => Promise<LeaveBalance \| null>` |
| delete | `(id: string) => Promise<boolean>` |

### IBalanceService

| Method | Signature |
|--------|-----------|
| getById | `(id: string) => Promise<LeaveBalance \| null>` |
| getByEmployee | `(employeeId: string) => Promise<LeaveBalance[]>` |
| getByEmployeeAndPolicy | `(employeeId: string, leavePolicyId: string) => Promise<LeaveBalance \| null>` |
| create | `(data: CreateBalanceDto) => Promise<LeaveBalance>` |
| deductDays | `(id: string, days: number) => Promise<LeaveBalance>` |
| restoreDays | `(id: string, days: number) => Promise<LeaveBalance>` |
| hasSufficientBalance | `(employeeId: string, leavePolicyId: string, requestedDays: number) => Promise<boolean>` |

### Validation rules

- `employeeId`: required, non-empty after trim
- `leavePolicyId`: required, non-empty after trim
- `totalEntitlement`: required, must be a positive finite integer (> 0)
- `fiscalYear`: required, must be a positive integer (> 0)
- `days` (deduct/restore): must be a positive finite number (> 0); fractional values are floored
- `requestedDays` (hasSufficientBalance): fractional values are floored before comparison
- All string fields are trimmed before storage
- Throws `ValidationError` (exported from balance.service.ts) on invalid input

### Business rules

- `remainingDays = Math.floor(totalEntitlement - usedDays)` — integer arithmetic, floor for safety
- **create**: sets `usedDays = 0`, `remainingDays = totalEntitlement`, `status = ACTIVE`
- **deductDays**: validates balance is ACTIVE, checks `remainingDays >= days`, increments `usedDays`, recalculates `remainingDays`, transitions to EXHAUSTED when `remainingDays` reaches 0
- **restoreDays**: validates balance is not CLOSED, checks `usedDays >= days`, decrements `usedDays`, recalculates `remainingDays`, transitions back to ACTIVE when `remainingDays > 0`
- **hasSufficientBalance**: returns `false` (never throws) when no balance exists or balance is not ACTIVE; floors fractional `requestedDays`
- CLOSED balances reject both deduction and restoration
- EXHAUSTED balances reject deduction but accept restoration (transitioning back to ACTIVE)

### Status transitions

```
ACTIVE ──deduct to zero──▶ EXHAUSTED
EXHAUSTED ──restore > 0──▶ ACTIVE
ACTIVE/EXHAUSTED ──(external)──▶ CLOSED (terminal)
```

### Entity invariants

- `remainingDays` is always derived from `totalEntitlement - usedDays` (never set independently)
- `remainingDays` is always a non-negative integer
- `usedDays` is always a non-negative integer
- `status` is consistent with `remainingDays`: ACTIVE when > 0, EXHAUSTED when 0
- `BalanceStatus` enum is defined locally in `balance.model.ts` — no dependency on `shared/types/`
- The module is self-contained — it does not import from `policy/` or `shared/types/`. Cross-module wiring (e.g., validating that `leavePolicyId` references a real policy) is deferred to the leave module (Phase 6).

## Planned modules (not yet built)

The following domain entities are defined in PLAN.md but not yet implemented:

- **leave** (Phase 6) — LeaveRequest with full lifecycle state machine
- **notification** (Phase 7) — Notification with read-status tracking

## system

System-level status (seed modules, pre-existing).

### SystemStatus

| Field | Type | Required |
|-------|------|----------|
| up | boolean | true |
| version | string | true |
