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

**Reversal tests as built (Phase 4)** — test-only phase; no production source changed. `tests/unit/modules/leave/leave.service.test.ts` gained a `cancel — APPROVED reversal` describe block (extending the existing suite — no second test file, and the existing `cancel` describe block was not rewritten), reusing the eight in-memory fakes and the `makeRequest`/`makeActor`/`makeBalance`/`makeEmployee`/`makePolicy` fixtures. `FakeLeaveRepository` now records `create` calls together with the forwarded client (`createCalls`) and implements `findByReversesRequestId`; `makeRequest` carries `reversesRequestId: null` for originals. Cases:

- **Immutability (the acceptance test)** — after cancelling an APPROVED request the stored original still reads `status: APPROVED` with its `approverId`, `approvalComment` and `decidedAt` unchanged, and the fake recorded **zero** `update` calls against the original id; a NEW row is created with `status: CANCELLED`, `reversesRequestId === original.id`, `requestedDays === 0`, `approverId`/`approvalComment`/`submittedAt`/`decidedAt` all `null`, `cancelledBy === actor.id`, `cancelledAt` set, and `employeeId`/`leaveTypeCode`/`startDate`/`endDate`/`reason` copied from the original.
- **Single release** — `usedDays` decremented by exactly the ORIGINAL row's `requestedDays` (not the reversal's 0), `pendingDays` untouched, the balance read with `forUpdate = true` before the write, and exactly ONE balance `update` call.
- **Side effects** — exactly one CANCEL audit entry (`AuditAction.CANCEL`, `entityType 'leave_request'`, `entityId` = the ORIGINAL id) and one cancellation notification to the requester (`relatedEntityId` = the ORIGINAL id).
- **Atomicity** — `uow.callCount === 1` with the stub client forwarded to the reversal insert, the balance read/write, the audit record and the notification create.
- **Terminality** — cancelling a row already in status `CANCELLED` throws `ConflictError` (409) and performs no insert, no balance read/write, no audit, no notification, and opens no transaction (`uow.callCount === 0`).

Assertions are containment-based (`.some(...)`, length checks), matching the existing suite's transaction assertions.

**Divergences from the reconciled architecture worth noting (Phase 4):**
- The tests assert the audit `entityId` and the notification `relatedEntityId` against the ORIGINAL request id, matching the implemented service — not the reconciled architecture's rule 8/9 (which named the NEW reversal row). The tests pin the code as built.
- `findByReversesRequestId` is exercised only as an interface-completeness check on the fake (it resolves the reversal row); `cancel` does not call it, so no test asserts a pre-release "already reversed" lookup.
- The reconciled architecture's derived `LeaveRequestEffectiveState` / `REVERSED` state is not asserted anywhere — it is not implemented.

**Reversal smoke proof as built (Phase 5)** — test-only phase; no production source changed. The only project file touched is `scripts/smoke.js`, which gained a Postgres-only **stage 9** (inside the existing `if (PG)` branch, so it is skipped with the existing persistence caveat in sqlite mode) proving the reversal end to end against real Postgres with real values, not status codes.

- **Second actor** — stage 9 seeds a second employee row (`smoke-admin`, `EmployeeRole.ADMIN`, employee number `E-0002`) and mints an ADMIN token with `signToken`; the seeded `smoke-employee` is an EMPLOYEE and can neither approve nor cancel an APPROVED request. The admin token is hand-minted (like stages 3b/3c), not a login token.
- **9a — create + submit + approve** — `POST /leaves` (login token) → `POST /leaves/:id/submit` → `POST /leaves/:id/approve` (ADMIN token); asserts 201/200/200 and that the approved body reads `status === APPROVED` with `approverId === 'smoke-admin'`. Captures `originalId` from the create response (never predicted — the repository generates it via `randomUUID()`) and `originalRequestedDays` from the approve response. The cancellable span is future-dated (`Math.max(Date.now(), curPeriod.start) + 2 days`) and inside the CURRENT period that stage 8 re-keyed `bal-1` to, so `resolveBalance` finds the row and the request reaches APPROVED.
- **9b — baseline** — reads `usedDays` via `GET /balances/me` immediately before the cancellation and asserts it equals `originalRequestedDays`.
- **9c — cancel** — `POST /leaves/:id/cancel` as the ADMIN token; asserts 200.
- **9d — immutability** — `GET /leaves/:id` for the ORIGINAL id still returns `status === APPROVED` with its `approverId`/`decidedAt` byte-identical to the approve response, and `reversesRequestId === null`.
- **9e — reversal** — `GET /leaves` returns BOTH rows: the original (APPROVED, `reversesRequestId` null) and a distinct row with `reversesRequestId === originalId`, `status === CANCELLED`, `requestedDays === 0`, `approverId`/`decidedAt` null, and `startDate`/`endDate`/`leaveTypeCode`/`employeeId` matching the original. No server-side collapsing and no query filter — `reversesRequestId` alone distinguishes the pair.
- **9f — single release** — `usedDays` decreased by exactly `originalRequestedDays` (a double release would land at `usedBefore - 2*requestedDays` and fail).
- **9g — terminality** — a second `POST /leaves/:id/cancel` on the reversal row returns 409 with `code: 'CONFLICT'`.

**Divergences from the plan worth noting (Phase 5):**
- PLAN.md Phase 5 step 1 said to approve "as the seeded manager/ADMIN actor"; the implementation seeds a NEW `smoke-admin` employee and mints its token with `signToken` rather than reusing the seeded `smoke-employee` (an EMPLOYEE, which cannot approve or cancel an APPROVED request). The plan's "using the login token and the seeded employee already established by the earlier stages" holds for the create/submit/read steps, but the approve/cancel steps need the second actor.
- The plan's step 2 allowed "via `GET /balances/me` or a direct read"; the implementation uses `GET /balances/me` for both the baseline and the post-cancel read, so the release is asserted as a delta through the same read path the application serves.
- The plan's step 5 asked to assert the reversal row's `startDate`/`endDate`/`leaveTypeCode`/`employeeId` match the original; the implementation does exactly that and additionally asserts the two rows do not share an id.

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
