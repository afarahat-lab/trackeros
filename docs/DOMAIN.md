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
| reason | string \| undefined | false |
| status | LeaveRequestStatus | true |
| approvedBy | string \| null | false |
| approvedAt | Date \| null | false |
| reversesRequestId | string \| null | false |
| createdAt | Date | true |
| updatedAt | Date | true |

**Relationships**
- `Employee` — many-to-one

**Reversal link (`reversesRequestId`)** — added by migration `20260914000001_add_reverses_request_id_to_leave_requests.js` (feature `f890ed1a`, Phase 1) and threaded end-to-end through the leave model and repository in Phase 2. The column is nullable text (`reverses_request_id`), with no NOT NULL, no default, and no foreign-key constraint (the self-reference to `leave_requests.id` is a value convention only, for pg/sqlite3 portability). Semantics: `NULL` means the row is an original request; a non-null value equals the `id` of the original request this row reverses. The column is write-once at insert and never updated — a reversal row is terminal and is never itself reversed. A UNIQUE **partial** index `leave_requests_reverses_request_id_unique` on `reverses_request_id` restricted to `WHERE reverses_request_id IS NOT NULL` enforces at most one reversal per original (the structural exactly-once guarantee); the partial predicate is load-bearing because every original row carries NULL and NULLs must not collide.

As implemented (Phase 2): `LeaveRequest` carries `reversesRequestId: string | null` as its **last** field (the canonical 15-field shape), and `CreateLeaveRequestInput = Omit<LeaveRequest, 'id'>` therefore also carries it. `PgLeaveRequestRepository` selects, maps and inserts the column (`COLUMNS`, `LeaveRequestRow`, `mapRow`, and the 15-value `create` INSERT all include `reverses_request_id`), and exposes `findByReversesRequestId(reversesRequestId, client?)` — read-only, returns `null` when no row references the id, honors the optional trailing `PoolClient`, and never opens a transaction. `LeaveService.create` supplies `reversesRequestId: null` (an original request reverses nothing). `UpdateLeaveRequestDto` and the repository's `FIELD_COLUMNS` map deliberately do **not** carry the field, so `update` is structurally unable to write it — the column is write-once at insert, which is what keeps an APPROVED row immutable (GP-008).

**Reversal behaviour as built (Phase 3)** — `LeaveService.cancel` splits by the original row's status inside its single `uow.withTransaction`:

- **DRAFT / SUBMITTED** cancel in place: the same row is updated to `CANCELLED` with `cancelledBy = actor.id` / `cancelledAt = now` (SUBMITTED also releases `pendingDays -= requestedDays`; DRAFT touches no balance). Unchanged from the pre-reversal implementation.
- **APPROVED** is a reversal, not an in-place update. The original row is **never** passed to `repository.update` — its `status`, `approverId`, `approvalComment` and `decidedAt` stay byte-identical. Instead a NEW `leave_requests` row is inserted via `repository.create` (with the transaction client) carrying: `employeeId`, `leaveTypeCode`, `startDate`, `endDate` and `reason` copied from the original; `status: CANCELLED`; `reversesRequestId = original.id`; `requestedDays: 0` (the reversal reserves and releases nothing — the original row remains the sole record of the span consumed); `approverId`, `approvalComment`, `submittedAt` and `decidedAt` all `null`; `cancelledBy = actor.id`; `cancelledAt = now`. `cancel` returns this new reversal row for the APPROVED path.
- **Release exactly once**: the balance row for the accrual period containing the ORIGINAL `startDate` is read with `forUpdate = true` and written once — `usedDays -= original.requestedDays` (the original's count, not the reversal's 0), `pendingDays` untouched.
- **Terminality**: a request whose `status` is already `CANCELLED` is rejected with `ConflictError` (409) *before* any work (no insert, no balance read/write, no audit, no notification). Together with the unique partial index this is the exactly-once guarantee; chained reversals are not implemented.
- **Side effects**: one CANCEL audit entry and one synchronous cancellation notification, both inside the same transaction with the client forwarded.

**Divergences from the reconciled architecture (`docs/ARCHITECTURE.md`, feature `f890ed1a`) worth noting** — the implementation follows the phase-authoritative spec where the two differ:
- The reconciled architecture's rule 8 said the reversal's audit `entityId` would be the NEW reversal row's id; the implementation writes `entityId = the ORIGINAL request id` (with `beforeState` = the untouched APPROVED original, `afterState` = the new reversal row). The notification's `relatedEntityId` likewise points at the ORIGINAL request id, not the reversal row.
- The reconciled architecture said the reversal row copies the original's `requestedDays`; the implementation sets `requestedDays: 0` (the phase spec's shape), so the released amount is read from the original row rather than the reversal.
- The reconciled architecture described `findByReversesRequestId` as the pre-release "already reversed" lookup; the implementation does **not** call it in `cancel` — the terminality guard is the `status === CANCELLED` check, and the unique partial index is the structural backstop. The repository method exists but is currently unused by the service.
- The derived `LeaveRequestEffectiveState` / `REVERSED` value object described in the reconciled architecture is **not** implemented (the phase spec explicitly excluded it); no persisted status was added.

### CreateLeaveRequestDto

| Field | Type | Required |
|-------|------|----------|
| employeeId | string | true |
| leaveTypeId | string | true |
| startDate | Date | true |
| endDate | Date | true |
| reason | string \| undefined | false |

### UpdateLeaveRequestDto

| Field | Type | Required |
|-------|------|----------|
| startDate | Date | false |
| endDate | Date | false |
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
| employmentStatus | 'ACTIVE' \| 'INACTIVE' \| 'TERMINATED' | true |
| createdAt | Date | true |
| updatedAt | Date | true |
| deletedAt | Date \| null | false |

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
