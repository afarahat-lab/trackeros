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

## Planned modules (not yet built)

The following domain entities are defined in PLAN.md but not yet implemented:

- **policy** (Phase 4) — LeavePolicy with entitlement, accrual, notice rules
- **balance** (Phase 5) — LeaveBalance with deduction/restoration logic
- **leave** (Phase 6) — LeaveRequest with full lifecycle state machine
- **notification** (Phase 7) — Notification with read-status tracking

## system

System-level status (seed modules, pre-existing).

### SystemStatus

| Field | Type | Required |
|-------|------|----------|
| up | boolean | true |
| version | string | true |
