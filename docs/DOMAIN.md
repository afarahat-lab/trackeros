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
| createdAt | Date | true |
| updatedAt | Date | true |
| reversesRequestId | string \| null | true |

**Relationships**
- `Employee` — many-to-one

**Reversal provenance (GP-008)** — `reversesRequestId` is `null` for every ordinary request and non-null only on a reversal row, where it equals the id of the original APPROVED request it reverses. It is set at INSERT time only and is never updated. A reversal row is born CANCELLED and is terminal/inert; at most one reversal row may exist per original request (UNIQUE index on `reverses_request_id`). Because a reversal row copies the original's `requestedDays` verbatim, any aggregation summing `requestedDays` MUST filter on `reverses_request_id IS NULL` or it double-counts.
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

## uptime
Represents readiness-probe data managed by the `uptime` module. The probe is a pure observation of database connectivity: it persists nothing, writes no audit record, and opens no transaction. All four types are module-local to `src/modules/uptime/uptime.model.ts` and are deliberately NOT promoted to `src/shared/types/` (single-module use).

### ReadinessState

| Value | Description |
|-------|-------------|
| READY | The connectivity probe resolved; maps to HTTP 200 `{status:'ready'}` |
| NOT_READY | The connectivity probe rejected; maps to HTTP 503 `{status:'not-ready'}` |

Exactly two members, both terminal, both lowercase hyphenated string literals whose value IS the wire value. No third member (DEGRADED / UNKNOWN / PENDING) exists — the enum is the response contract. The probe is binary and total: any rejection (connection refused, auth failure, timeout, pool exhaustion) maps to `NOT_READY` without discrimination.

### ReadinessStatus

| Field | Type | Required |
|-------|------|----------|
| status | ReadinessState | true |

A value object with `status` as its sole field — no identity, no timestamp, no diagnostic detail, no error information. It is the complete and only payload of the readiness response and is never persisted or enriched.

### ReadinessResult

A discriminated union of exactly two shapes: `{ ok: true }` and `{ ok: false; error: unknown }`. The success shape carries no error; the failure shape carries the caught rejection (or the timeout `Error` when the 2000ms bound fired). `error` is typed `unknown` — never `any` — matching `ReadinessProbe.failureReason`.

It is the internal, per-call outcome of a single readiness evaluation: produced only by `UptimeService.checkReadiness()`, never thrown, never logged by the service, and never serialized. The route reads only the `ok` discriminator and hands `error` to `request.log.error`; the wire body remains `ReadinessStatus`. Ownership split is binding — the service owns the failure, the route owns the logging.

### ReadinessProbe
| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| startedAt | Date | true |
| completedAt | Date \| null | true |
| outcome | ReadinessState \| null | true |
| failureReason | unknown \| null | true |

Transient and per-request: created, settles, and is discarded within a single evaluation. Never persisted, never cached, never shared between requests, and never serialized into an HTTP body. Its lifecycle states `PENDING → SUCCEEDED` / `PENDING → FAILED` are derived from field nullness (`completedAt`/`outcome` null while PENDING), NOT from additional `ReadinessState` members; both terminal states are final and a probe is never re-entered, retried, or reused. `failureReason` is domain-internal and never crosses the HTTP boundary.

**Delivery note (Phases 1–3):** the type is declared in `uptime.model.ts` but is not materialised by the delivered code — `UptimeService.checkReadiness()` maps probe resolution/rejection directly to the `ReadinessResult` discriminator without constructing a `ReadinessProbe`. The lifecycle states above describe the type's shape, not an instantiated object. Phase 3's unit tests (`tests/unit/modules/uptime/uptime.service.test.ts`) pin the surrounding contract from the outside: `ReadinessState.READY === 'ready'` / `NOT_READY === 'not-ready'`, the `ReadinessStatus` body as exactly `{ status }` with no error detail, and `ReadinessResult` as exactly `{ ok: true }` or `{ ok: false, error }` carrying the same rejection object. No production file was changed by that phase.
