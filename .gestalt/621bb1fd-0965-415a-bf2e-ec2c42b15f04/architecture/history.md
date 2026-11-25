# Architecture history — feature 621bb1fd-0965-415a-bf2e-ec2c42b15f04

Extracted VERBATIM from `docs/ARCHITECTURE.md` on 2026-11-25 (owner's decision), where
planning had appended it as a per-feature block. The consolidation that followed merged
the repeated sections of all fourteen such blocks into one canonical section per
heading; this file is the unmerged original for THIS feature, including any question
later answered and any decision later superseded.

Nothing below is edited. Source lines 243-359 of the pre-consolidation
file, 13,171 bytes.

---

<!-- gestalt:architecture feature=621bb1fd-0965-415a-bf2e-ec2c42b15f04 START -->
## Feature: Leave cancellation flow

### Stack compliance
TypeScript 20, Fastify, PostgreSQL via pg, modular monolith. No stack deviations.

### Domain entities
- **LeaveRequest** — lifecycle: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED. Gains `cancelledBy` and `cancelledAt` (null until cancelled).
- **LeaveBalance** — lifecycle: OPEN, CLOSED. Cancellation mutates `pendingDays` (DRAFT/SUBMITTED) or `usedDays` (APPROVED).
- **AuditLog** — lifecycle: RECORDED. Immutable record; cancellation writes action CANCEL.
- **Notification** — lifecycle: PENDING, SENT, READ, ARCHIVED. Notifies affected employee.

### Conceptual tables (no DDL)
- **leave_requests**: id, employee_id, leave_type_code, start_date, end_date, requested_days, reason, status, approver_id, approval_comment, submitted_at, decided_at, cancelled_by, cancelled_at. PK id. FKs employee_id -> employees.id, leave_type_code -> leave_types.code, approver_id -> employees.id, cancelled_by -> employees.id. Indexes: employee_id, status, (leave_type_code, start_date).
- **leave_balances**: id, employee_id, leave_type_code, period_start, period_end, entitled_days, used_days, pending_days. PK id. FKs employee_id -> employees.id, leave_type_code -> leave_types.code. Unique index (employee_id, leave_type_code, period_start, period_end); index employee_id.
- **audit_logs**: id, actor_id, action, entity_type, entity_id, before_state, after_state, occurred_at. PK id. FK actor_id -> employees.id. Indexes (entity_type, entity_id), actor_id.
- **notifications**: id, recipient_id, type, title, message, related_entity_type, related_entity_id, status, created_at, read_at. PK id. FK recipient_id -> employees.id. Indexes recipient_id, status.

### Repositories
- ILeaveRepository -> PgLeaveRequestRepository: create, findById, update, findByQuery
- IBalanceRepository -> PgLeaveBalanceRepository: create, findById, findByKey, update
- IAuditRepository -> PgAuditLogRepository: create, findById
- INotificationRepository -> PgNotificationRepository: create, findById, updateStatus

### Modules
- **leave** (`src/modules/leave/`) owns ILeaveService.cancel + LeaveService.cancel orchestration, cancellation authorization, balance release, POST /leaves/:id/cancel, CANCEL audit + notification.
- **shared-types** (`src/shared/types/`) owns AuditAction.CANCEL enum value.

### Dependency map
leave -> shared-types, balance, audit, notification, employee, validation, policy, shared-db, shared-errors.

### Cross-cutting contracts
- **Auth**: request.user: { id: string; role: EmployeeRole } where EmployeeRole = 'EMPLOYEE' | 'MANAGER' | 'ADMIN'. JWT bearer verified by auth middleware; resolveActor validates presence/role at API boundary; RBAC enforced in service (owner DRAFT/SUBMITTED, direct-manager APPROVED), never inline in route.
- **Error**: Errors return { error: string; code: string }. Validation -> 400 ValidationError; auth -> 401 UnauthorizedError; authorization -> 403 ForbiddenError; not found -> 404 NotFoundError; invalid state transition -> 409 ConflictError; other -> 500.
- **Transaction**: Cancellation is atomic via IUnitOfWork.withTransaction (PgUnitOfWork: PoolClient, BEGIN, callback, COMMIT/ROLLBACK, release). Repository/service methods that join a caller transaction take optional trailing PoolClient; cancel passes client to ILeaveRepository.update, IBalanceRepository.update, IAuditService.record, INotificationService.create. Balance reads before write use findByKey with forUpdate=true.

### Resolved conflicts
- Added `cancelled_by` and `cancelled_at` to leave_requests to match LeaveRequest.cancelledBy/cancelledAt.
- Added AuditAction.CANCEL to shared-types (resolves data open question).
- Balance release uses canonical inclusive day count: requestedDays = endDate - startDate + 1.

### Recommended phases
1. Add AuditAction.CANCEL to shared-types.
2. Add cancel to ILeaveService + LeaveService.
3. Add POST /leaves/:id/cancel route.
4. LeaveService cancel unit tests.

### Phase 1 delivered (AuditAction.CANCEL enum member)

This phase delivered only the shared-enum change (recommended phase 1); the cancel service, route, and tests (phases 2–4) are not yet implemented.

- `src/shared/types/index.ts` — `AuditAction` gained `CANCEL = 'CANCEL'`, appended after `REJECT` in the existing member order, so the enum is now exactly `CREATE, UPDATE, DELETE, APPROVE, REJECT, CANCEL` (each an uppercase string-literal value equal to its member name). No other enum or DTO changed.
- `tests/unit/shared/types.test.ts` — the existing `AuditAction` member-list assertion was extended to expect the six-member order `['CREATE','UPDATE','DELETE','APPROVE','REJECT','CANCEL']` (the test description was updated to match).

**Divergences from the plan worth noting:**
- PLAN.md Phase 1 prescribed searching for consumers that switch exhaustively on `AuditAction` and updating them so the new CANCEL case is handled. No such switch exists: `src/modules/audit/audit.service.ts` validates via `Object.values(AuditAction).includes(input.action)`, which accepts the new member without modification, and the leave service references `AuditAction` only by value. No consumer changes were required.
- The `UpdateLeaveRequestDto` / `FIELD_COLUMNS` map do **not** yet carry `cancelledBy`/`cancelledAt` — those belong to the Phase 2 service/repository work and are intentionally absent here.

### Phase 2 delivered (cancel service, model/repository support, and unit tests)

This phase completes the cancellation flow's service, persistence, and test layers. The `POST /leaves/:id/cancel` route (recommended phase 3) was **not** added in this phase — it was delivered in Phase 3 (see below).

**model** — `LeaveRequest` gained `cancelledBy: string | null` and `cancelledAt: Date | null` (both null until cancelled), bringing the entity to 14 fields. `CreateLeaveRequestInput` is unchanged in shape (still `Omit<LeaveRequest, 'id'>`), so `create` now supplies both new fields as `null`.

**shared-types** — `UpdateLeaveRequestDto` gained `cancelledBy?: string` and `cancelledAt?: Date` (the only shared-types change this phase; `AuditAction.CANCEL` was already added in Phase 1).

**repository** — `PgLeaveRequestRepository` gained the two new columns end-to-end: `COLUMNS` now selects `cancelled_by, cancelled_at`; `LeaveRequestRow`/`mapRow` carry them; `create` inserts 14 values; and `FIELD_COLUMNS` maps `cancelledBy: 'cancelled_by'` / `cancelledAt: 'cancelled_at'` so `update` can set them.

**service** — `ILeaveService` gained `cancel(actor, requestId)`; `LeaveService.cancel` implements it plus a private `assertCanCancel` helper.

- `assertCanCancel` authorization: the owner may cancel their own DRAFT or SUBMITTED request; otherwise only an APPROVED request may be cancelled, by the direct manager (`employee.managerId === actor.id`) or an ADMIN (exempt from the direct-manager check). All other combinations throw ForbiddenError.
- Timing guard: cancellation is blocked once `startDate <= today` (UTC day comparison) with ConflictError — this is what removes any need to pro-rate the released balance.
- Balance release (full `requestedDays`, no pro-rating): DRAFT → no balance read or write; SUBMITTED → `pendingDays -= requestedDays`; APPROVED → `usedDays -= requestedDays`. The balance row is read with `forUpdate = true` (row lock) before the write, exactly as submit/approve/reject.
- Status transition: `status → CANCELLED` with `cancelledBy = actor.id` and `cancelledAt = now`.
- Side effects: a CANCEL audit entry (`AuditAction.CANCEL`) and a synchronous cancellation notification to the requester.
- Atomicity: the whole operation runs inside one `uow.withTransaction`, with the client threaded through every repository/service call.

**tests** — the `cancel` describe block in `tests/unit/modules/leave/leave.service.test.ts` covers owner-cancels-DRAFT (no balance touch), owner-cancels-SUBMITTED (pendingDays release), direct-manager-cancels-APPROVED (usedDays release), ADMIN-cancels-APPROVED, the ForbiddenError guards (non-owner, owner-cancels-own-APPROVED, non-direct-manager), the timing ConflictError, and NotFoundError — all with containment-based transaction assertions (single `withTransaction` callback, stub client forwarded).

**Divergences from the plan worth noting:**
- The plan's phase 2 prescribed "no tests in this phase" (tests were phase 4); the implementation delivered the service and the tests together, deferring the route to Phase 3.
- The plan prescribed reading the balance row with the row lock "exactly as submit/approve/reject do"; the implementation skips the balance read entirely for DRAFT (which reserved nothing), reading/locking only for SUBMITTED and APPROVED.

### Phase 3 delivered (POST /leaves/:id/cancel route)

This phase adds the HTTP surface for cancellation, completing the four recommended phases.

**routes** — `leaveRoutes(fastify)` in `src/modules/leave/leave.routes.ts` gained a fifth endpoint, `POST /leaves/:id/cancel` (200), following the existing conventions exactly: no controller file (the route calls `leaveService.cancel(actor, request.params.id)` directly), `resolveActor` extracts `request.user` and enforces role membership at the API boundary (UnauthorizedError on missing/invalid actor), `sendError` maps `AppError` to `{ error, code }` with the correct status and any other throw to 500, and the service instance is resolved from `fastify.leaveService` if present, else `createLeaveService()`. The endpoint mirrors the submit/approve/reject handlers (try/catch → `request.log.error` → `sendError`).

**Divergences from the plan worth noting:**
- None — this phase matches PLAN.md Phase 3 exactly (one file, `leave.routes.ts`, no service logic, no tests).

### Phase 4 delivered (cancel unit tests)

This phase adds the Jest unit tests for `LeaveService.cancel` to `tests/unit/modules/leave/leave.service.test.ts`, extending the existing suite. No production source files were modified — the Phase 1–3 deliverables (`AuditAction.CANCEL`, the cancel service, and the route) are treated as fixed contracts.

**Coverage** — a new `cancel` describe block exercises the operation's authorization, timing guard, balance release, status transition, side effects, and atomicity, reusing the existing eight in-memory fakes and fixtures (`makeRequest`, `makeActor`, `makeBalance`, `makeEmployee`, `makePolicy`) and their recorded-call arrays:

- **Owner cancels DRAFT** — status → CANCELLED with `cancelledBy = actor.id` and `cancelledAt` set; asserts **zero** balance reads/writes (`findByKeyCalls` and `updateCalls` remain empty), exactly one CANCEL audit entry (`AuditAction.CANCEL`, `entityType 'leave_request'`, `entityId = request id`), one synchronous cancellation notification to the requester, and `uow.callCount === 1` with the stub client forwarded to every participating call.
- **Owner cancels SUBMITTED** — releases the full `requestedDays` by decrementing `pendingDays` (leaving `usedDays` untouched), asserting the balance row was read with `forUpdate = true` before the write.
- **Direct manager cancels APPROVED** — releases the full `requestedDays` by decrementing `usedDays` (leaving `pendingDays` untouched), with the `forUpdate` row lock asserted.
- **ADMIN cancels APPROVED** — an ADMIN cancels an APPROVED request for anyone (exempt from the direct-manager check).
- **Authorization guards** — ForbiddenError for a non-owner cancelling a DRAFT, the owner cancelling their own APPROVED request, and a non-direct manager cancelling an APPROVED request.
- **Timing guard** — ConflictError when `startDate` is today or in the past (a past start and a same-UTC-day start); success paths use future startDate fixtures relative to `Date.now()`.
- **Actor validation** — UnauthorizedError on a missing actor, ForbiddenError on an invalid role.
- **NotFoundError** — unknown request id.

**Divergences from the plan worth noting:**
- The plan's Phase 4 coverage is matched, plus two extra actor-validation cases (missing actor → UnauthorizedError, invalid role → ForbiddenError) and an explicit "starts today" timing case beyond the single past-date case.
- The Phase 2 delivered section above noted the cancel tests were delivered together with the service; the committed diff for this phase shows the test file as the sole production change, so the cancel tests are consolidated here (Phase 4), matching the plan's phase split.

### Open questions
- ADMIN cancellation authority for APPROVED requests — **resolved**: ADMIN may cancel an APPROVED request for anyone (exempt from the direct-manager check).
- Whether APPROVED cancellation is allowed after startDate/endDate has passed — **resolved**: blocked once `startDate <= today` (ConflictError).
- Whether usedDays release is full or pro-rated when leave has partially elapsed — **resolved**: full release, no pro-rating, because the timing guard makes cancellation possible only before the leave starts.
<!-- gestalt:architecture feature=621bb1fd-0965-415a-bf2e-ec2c42b15f04 END -->

