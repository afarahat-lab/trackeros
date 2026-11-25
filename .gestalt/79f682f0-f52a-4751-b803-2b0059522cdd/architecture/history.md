# Architecture history — feature 79f682f0-f52a-4751-b803-2b0059522cdd

Extracted VERBATIM from `docs/ARCHITECTURE.md` on 2026-11-25 (owner's decision), where
planning had appended it as a per-feature block. The consolidation that followed merged
the repeated sections of all fourteen such blocks into one canonical section per
heading; this file is the unmerged original for THIS feature, including any question
later answered and any decision later superseded.

Nothing below is edited. Source lines 1091-1246 of the pre-consolidation
file, 30,096 bytes.

---

<!-- gestalt:architecture feature=79f682f0-f52a-4751-b803-2b0059522cdd START -->
## GP-008 Reversal — Leave Lifecycle Immutability
### Purpose
Bring the leave lifecycle into line with GP-008 ("Approval workflows are immutable once completed"): a completed approval must not be modified, and a reversal creates a NEW instance that references the original. **Delivered** — `LeaveService.cancel` no longer mutates an APPROVED request in place to CANCELLED; it inserts a new CANCELLED reversal row (see "Phase 2 delivered" below). The persistence foundation (`reverses_request_id` column, model field, repository plumbing) was delivered in Phase 1.

### Domain entities

| Entity | Table | Lifecycle states |
| --- | --- | --- |
| `LeaveRequest` | `leave_requests` | DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED |
| `LeaveRequestReversal` (domain ROLE of `LeaveRequest`, not a separate table) | `leave_requests` (row with `reverses_request_id` non-null) | CANCELLED |
| `LeaveBalance` | `leave_balances` | OPEN, CLOSED |
| `AuditLog` | `audit_logs` | RECORDED |
| `Notification` | `notifications` | PENDING, SENT, READ |
| `LeaveRequestView` (read projection) | — | (none) |

**Lifecycle semantics introduced / newly load-bearing:**
- `LeaveRequest`: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED (unchanged set). New binding semantics: **APPROVED is a TERMINAL, IMMUTABLE state (GP-008)** — `status`, `approverId`, `approvalComment`, `decidedAt` may never be updated once APPROVED. DRAFT and SUBMITTED remain mutable and are cancelled in place.
- `LeaveRequestReversal`: **CANCELLED** (single state; born CANCELLED, never transitions). Terminal and inert: no submit/approve/reject/cancel, no reservation, never itself reversed.
- `LeaveBalance`: OPEN, CLOSED (unchanged). Cancellation of an APPROVED request releases `requestedDays` from `usedDays` exactly once, in the same unit of work as the reversal insert.
- `AuditLog`: RECORDED (unchanged). One CANCEL record per approved cancellation, written in the same unit of work.
- `LeaveRequestView`: no lifecycle; gains `reversesRequestId` on the wire.

**Named transitions:**
- `cancelInPlace`: DRAFT -> CANCELLED and SUBMITTED -> CANCELLED (mutates the same row; SUBMITTED also releases `pendingDays`).
- `reverseApproved`: APPROVED -> (original row unchanged) + new `LeaveRequestReversal` row in CANCELLED with `reversesRequestId` = original id; releases `usedDays` on the balance; writes CANCEL audit; notifies requester.

### Business rules
1. **GP-008 immutability** — once a `LeaveRequest` reaches APPROVED, `status`/`approverId`/`approvalComment`/`decidedAt` are immutable. Cancellation of an APPROVED request must not write to the original row at all.
2. **Reversal creates a NEW instance** — cancelling an APPROVED request inserts a new `leave_requests` row with status CANCELLED and `reverses_request_id` = the original id. The original APPROVED row is left byte-identical. The reversal row is born in CANCELLED and never transitions again.
3. **In-place cancellation preserved for non-completed states** — cancelling DRAFT or SUBMITTED mutates that same row to CANCELLED (with `cancelledBy`/`cancelledAt`) exactly as today; no reversal row is created.
4. **Balance release is exactly-once and unchanged in amount** — the original request's `requestedDays` is returned to `usedDays` (`usedDays -= requestedDays`, no pro-rating) exactly once, inside the same unit of work as the reversal insert. It must not be skipped and must not be applied twice.
5. **Canonical day count** — `requestedDays = endDate - startDate + 1` (inclusive calendar days, whole-day UTC, no weekend/holiday exclusion), computed once via the shared `requestedDays` helper. The reversal row copies the original's `requestedDays` verbatim and never re-derives it; the balance release consumes that same copied value.
6. **Audit** — the cancellation of an APPROVED request writes exactly one `AuditLog` record with action CANCEL, `entityType` 'leave_request', `entityId` = the ORIGINAL APPROVED request id, `beforeState` = the original APPROVED request, `afterState` = the reversal row — inside the same unit of work as the reversal insert and the balance release (GP-002).
7. **Wire honesty** — because a cancelled-after-approval request is two rows, the read model (GET /leaves, GET /leaves/:id) must expose `reversesRequestId` so a client can distinguish the original APPROVED row (`reversesRequestId` = null) from the reversal CANCELLED row (`reversesRequestId` = original id). A client must never infer the pairing from matching dates or `employeeId`.
8. **Authorization and timing guards unchanged** — the owner may cancel their own DRAFT/SUBMITTED request; only the direct manager or an ADMIN may cancel an APPROVED request; cancellation is blocked once `startDate <= today` (UTC day comparison) with `ConflictError`. The reversal row inherits the original's `employeeId`, so role-scoped visibility (EMPLOYEE self, MANAGER self + direct reports, ADMIN all) applies to it identically.
9. **Reversal row is terminal and inert** — it reserves nothing, cannot be submitted/approved/rejected/cancelled again, and is never the target of a second reversal. Only the original APPROVED row's `requestedDays` drives the single balance release.
10. **Double-cancel guard** — a second cancel of the same APPROVED original is rejected: the service calls `findByReversesRequestId` inside the transaction and throws `ConflictError`; the UNIQUE index on `reverses_request_id` is the database backstop.

### Conceptual table specifications (no DDL)

**`leave_requests`** — fields: `id`, `employee_id`, `leave_type_code`, `start_date`, `end_date`, `requested_days`, `reason`, `status`, `approver_id`, `approval_comment`, `submitted_at`, `decided_at`, `cancelled_by`, `cancelled_at`, `reverses_request_id`. PK `id`. FKs: `employee_id -> employees.id`, `leave_type_code -> leave_types.code`, `approver_id -> employees.id`, `cancelled_by -> employees.id`, `reverses_request_id -> leave_requests.id`. Indexes: `id` (PK); `reverses_request_id` UNIQUE nullable — the DB backstop for exactly-once release and the `findByReversesRequestId` lookup; `employee_id, status` composite — role-scoped list queries and owner/status guards; `leave_type_code, start_date` — type filter, inclusive date-range filter, `ORDER BY start_date DESC`; `status` — status-filtered lists and the existing-reversal scan; `employee_id` — FK lookups and per-employee history.

**`leave_balances`** — fields: `id`, `employee_id`, `leave_type_code`, `period_start`, `period_end`, `entitled_days`, `used_days`, `pending_days`. PK `id`. FKs: `employee_id -> employees.id`, `leave_type_code -> leave_types.code`. Indexes: `id` (PK, release update target); `employee_id, leave_type_code, period_start, period_end` UNIQUE — `findByKey` resolves exactly one row and is the `forUpdate` lock target; `employee_id` — per-employee balance reads.

**`audit_logs`** — fields: `id`, `actor_id`, `action`, `entity_type`, `entity_id`, `before_state`, `after_state`, `occurred_at`. PK `id`. FK: `actor_id -> employees.id`. Indexes: `id` (PK); `entity_type, entity_id` — the trail for one leave request, with the reversal's CANCEL entry written against the ORIGINAL request id; `actor_id` — actor-history queries.

**`notifications`** — fields: `id`, `recipient_id`, `type`, `title`, `message`, `related_entity_type`, `related_entity_id`, `status`, `created_at`, `read_at`. PK `id`. FK: `recipient_id -> employees.id`. Indexes: `id` (PK); `recipient_id, status` — inbox read pattern; `related_entity_type, related_entity_id` — the cancellation notification points at the ORIGINAL request id.

### Repository interfaces and concrete implementations

- **`ILeaveRepository` / `PgLeaveRequestRepository`** (PostgreSQL via the shared pg Pool, `src/shared/db/connection.ts`; every method takes an optional trailing `PoolClient` and falls back to the shared pool; the repository never opens BEGIN/COMMIT/ROLLBACK):
  - `create(input, client?)` — inserts all 15 columns including `reverses_request_id`; used for the NEW CANCELLED reversal row.
  - `findById(id, client?)` — returns null when absent.
  - `findByReversesRequestId(reversesRequestId, client?)` — resolves the reversal row for an original id so the service can detect an already-reversed APPROVED request before releasing the balance a second time.
  - `update(id, changes, client?)` — dynamic SET from FIELD_COLUMNS; used ONLY for the in-place DRAFT/SUBMITTED cancellation. MUST NOT be called with the id of an APPROVED row (GP-008).
  - `findByQuery(params, client?)` — status/leaveTypeCode/date-range/employeeIds filters plus limit/offset, `ORDER BY start_date DESC`; returns both the original APPROVED row and its CANCELLED reversal row, each carrying `reverses_request_id`.
- **`IBalanceRepository` / `PgLeaveBalanceRepository`**: `findByKey(employeeId, leaveTypeCode, periodStart, periodEnd, client?, forUpdate?)` (release path passes `forUpdate=true`), `update(id, changes, client?)` (the single write that releases `requestedDays` back to `usedDays` or decrements `pendingDays`), `findById`, `create`.
- **`IAuditRepository` / `PgAuditLogRepository`**: `create(input, client?)` (generates id via `randomUUID()`, stamps `occurredAt`, JSON-stringifies before/after state; the reversal writes action CANCEL with `entityId` = the ORIGINAL request id), `findById`.
- **`INotificationRepository` / `PgNotificationRepository`**: `create(input, client?)` (`relatedEntityId` = the ORIGINAL request id), `findById`, `updateStatus`.

### Module boundaries

- **Presentation** — `src/modules/*/*.routes.ts` (Fastify route handlers; no controller layer). Routes do boundary parsing, `resolveActor`, and `sendError`; no business logic, no SQL.
- **Application** — `src/modules/*/*.service.ts` (`ILeaveService`, `IBalanceService`, `IAuditService`, `INotificationService`, `IEmployeeService`, `IPolicyService`, `IValidationService`). Services own the transaction boundary via `IUnitOfWork.withTransaction` and orchestrate repositories. `leave` is the sole orchestrator.
- **Domain** — `src/modules/*/*.model.ts` (entities + `Create*Input` types) and `src/shared/types/index.ts` (canonical enums, cross-module DTOs, `requestedDays`).
- **Infrastructure** — `src/modules/*/*.repository.ts` (`Pg*Repository`), `src/shared/db/` (pool, `PgUnitOfWork`), `migrations/`.

Every public service method is declared on an interface before its implementation. No implementation is referenced by a consumer except through its interface plus a composition factory (`createLeaveService`, `createPolicyService`).

`reversesRequestId` is a field on the `LeaveRequest` entity, consumed by exactly one backend module (`leave`), so it stays in `src/modules/leave/leave.model.ts` and is NOT promoted to `src/shared/types/`. On the web root, `LeaveRequestView` is imported by `web-leave`, `web-approvals` and `web-presentation-pages`, so the new field is added to `web/src/shared/types/index.ts`.

### Dependency map

`leave -> {shared-types, shared-db, shared-errors, shared-date, balance, audit, notification, validation, employee, policy}`; `balance -> {policy, employee, shared-db, shared-date, shared-types}`; `policy -> {leave-type, shared-types, shared-db}`; `audit`/`notification`/`employee`/`validation` -> shared foundations only. No module depends back on `leave`. Web root: `web-presentation-pages -> web-approvals -> web-leave -> web-infrastructure-api -> web-shared-types`. Every edge is one-directional; no cycle exists.

### Cross-cutting contracts

**Auth** — `request.user: { id: string; role: EmployeeRole }` where `EmployeeRole = 'EMPLOYEE' | 'MANAGER' | 'ADMIN'`. Identity and role come from a JWT bearer token verified by the existing `registerAuth` preHandler (`src/shared/auth/index.ts`), which populates `request.user` from `payload.sub` (id) and `payload.role`; only `/auth/login` is in `PUBLIC_PATHS`. RBAC is enforced at the API boundary by the route-level `resolveActor` helper (throws `UnauthorizedError` on a missing/invalid actor) and in the service by `assertAuthenticated`/`assertCanCancel`/`assertCanDecide` — never inline in a route handler. This feature adds no new endpoint and no new role: `POST /leaves/:id/cancel` keeps its existing authorization, and the reversal row inherits the original's `employeeId`, so role-scoped visibility applies to it unchanged.

**Error response** — errors return `{ error: string; code: string }`. Validation failure -> HTTP 400 (`ValidationError`, code `VALIDATION`); authentication failure -> 401 (`UnauthorizedError`, code `UNAUTHORIZED`); authorization failure -> 403 (`ForbiddenError`, code `FORBIDDEN`); not found -> 404 (`NotFoundError`, code `NOT_FOUND`); invalid state transition -> 409 (`ConflictError`, code `CONFLICT`); any other throw -> 500 `{ error: 'Internal Server Error' }`. `GET /leaves/:id` returns the same 404 for a request the caller may not see as for one that does not exist. This feature adds no new status code: cancelling an APPROVED request still returns 200 with the new CANCELLED reversal row, and the existing guards keep their current 409/403 responses.

**Transaction / unit of work** — cancelling an APPROVED request performs, in one unit of work: (a) insert the new CANCELLED reversal row, (b) release `requestedDays` from `used_days` on the balance row, (c) write the CANCEL audit entry, (d) insert the cancellation notification. Repository and service methods that must join a caller's transaction take an OPTIONAL trailing `client?: PoolClient` parameter, defaulting to the shared pool (`src/shared/db/connection.ts`) when omitted. The calling service owns the unit of work: `LeaveService.cancel` calls `this.uow.withTransaction(async (client) => { ... })` (`PgUnitOfWork` acquires a client from the shared pool, BEGIN, runs the callback, COMMIT on resolve / ROLLBACK on throw, always releases). Inside the callback the same `client` is threaded to every participating call: `repository.findByReversesRequestId(originalId, client)`, `repository.create(reversalInput, client)`, `balanceRepository.findByKey(..., client, true)` (row lock) then `balanceRepository.update(balanceId, { usedDays: ... }, client)`, `auditService.record(entry, client)`, `notificationService.create(input, client)`. BEGIN/COMMIT/ROLLBACK appear only in `PgUnitOfWork` — never in a repository or service. The DRAFT/SUBMITTED in-place cancellation uses the same contract. Read paths (`list`, `getById`) open no transaction and forward no client.

### Recommended phases

1. **Phase 1 — `reverses_request_id` column, model field, repository plumbing** (3 files). New knex migration (PostgreSQL) adds nullable `reverses_request_id` with a self-referencing FK and a UNIQUE index. `LeaveRequest` gains `reversesRequestId: string | null`; `PgLeaveRequestRepository` carries it end-to-end and gains `findByReversesRequestId`. **Delivered.**
2. **Phase 2 — `LeaveService.cancel` reversal branch (GP-008)** (1 file). DRAFT/SUBMITTED keep the in-place `update` path; APPROVED inserts a NEW CANCELLED row via `create` and never writes the original. Balance release, CANCEL audit and notification stay exactly-once inside one `withTransaction`. A pre-insert `findByReversesRequestId` check throws `ConflictError` on a repeat cancel. **Delivered — see below.**
3. **Phase 3 — expose `reversesRequestId` on the read model (wire + web)** (2 files). Backend read path needs no change; `web/src/shared/types/index.ts` `LeaveRequestView` gains `reversesRequestId: string | null` and the API client passes it through. **Delivered — see below.**
4. **Phase 4 — tests: reversal unit test + smoke assertion** (2 files). Unit test proves the original stays APPROVED, exactly one CANCELLED reversal row references it, `usedDays` released exactly once, one CANCEL audit entry and one notification, all in a single `withTransaction`. Smoke stage approves then cancels against real Postgres and asserts two rows with the original still APPROVED. **Delivered — see below.**

### Phase 2 delivered (LeaveService.cancel reversal branch)
This phase implements the GP-008 reversal branch in `src/modules/leave/leave.service.ts` — the sole file changed. The Phase 1 persistence foundation (`reverses_request_id` column, `LeaveRequest.reversesRequestId`, `ILeaveRepository.findByReversesRequestId`) was already in place and is consumed as a fixed contract.

**`LeaveService.cancel(actor, requestId)`** now branches on the request's current status inside the single `uow.withTransaction` callback:

- **APPROVED (reversal path)** — the original row is never written. The service:
  1. calls `repository.findByReversesRequestId(request.id, client)` and throws `ConflictError('This leave request has already been reversed')` when a reversal already exists (the double-cancel guard; the UNIQUE index on `reverses_request_id` is the DB backstop);
  2. resolves the balance via `resolveBalance(employeeId, leaveTypeCode, startDate, client, true)` (row lock) and releases the full `requestedDays` with `balanceRepository.update(balance.id, { usedDays: balance.usedDays - request.requestedDays }, client)` — no pro-rating;
  3. inserts a NEW row via `repository.create(...)` with `status: LeaveStatus.CANCELLED`, `reversesRequestId: request.id`, `employeeId`/`leaveTypeCode`/`startDate`/`endDate`/`requestedDays`/`reason` copied verbatim from the original, `approverId`/`approvalComment`/`submittedAt`/`decidedAt` all `null` (the reversal was never approved), and `cancelledBy: actor.id` / `cancelledAt: now`;
  4. writes exactly one `AuditAction.CANCEL` entry with `entityId: request.id` (the ORIGINAL), `beforeState: request`, `afterState: reversal`;
  5. creates exactly one cancellation notification to the requester (`relatedEntityId: requestId`);
  6. returns the reversal row (the route responds 200 with it).

- **SUBMITTED (in-place path)** — unchanged behaviour: resolve the balance with `forUpdate = true`, `pendingDays -= requestedDays`, then `repository.update(id, { status: CANCELLED, cancelledBy: actor.id, cancelledAt: now }, client)`.
- **DRAFT (in-place path)** — unchanged behaviour: no balance read or write at all; `repository.update(id, { status: CANCELLED, cancelledBy: actor.id, cancelledAt: now }, client)`.

`now` is hoisted once per call (`const now = new Date()`) and reused for both the reversal's `cancelledAt` and the in-place `cancelledAt`. Authorization (`assertCanCancel`) and the timing guard (`startDate <= today` -> `ConflictError`) are unchanged and run before the transaction.

**Divergences from the plan worth noting:**
- The plan described the DRAFT/SUBMITTED path as "byte-identical"; the implementation restructured the branch (APPROVED handled first, then a single `if (request.status === SUBMITTED)` block) rather than keeping the original `if (status !== DRAFT) { ... if SUBMITTED ... else ... }` nesting. Observable behaviour is identical — DRAFT still touches no balance, SUBMITTED still releases `pendingDays` — but the code shape differs from the pre-existing structure.
- The plan's Phase 2 was scoped to production code only ("no test file changes this phase"); the committed diff for this phase likewise touches no test file. The reversal unit test and smoke assertion were delivered in Phase 4 (see below).

### Phase 3 delivered (expose `reversesRequestId` on the web read model)
This phase delivers recommended Phase 3 — surfacing the reversal linkage on the web read model. The backend read path needed no change: `src/modules/leave/leave.routes.ts` is untouched (the repository's `mapRow` already supplies `reversesRequestId` and the routes pass the service's `LeaveRequest` objects through unchanged), resolving the phase's open ambiguity in favour of "leave the route untouched" rather than adding a route-level mapping.

**`web/src/shared/types/index.ts`** — `LeaveRequestView` gains `reversesRequestId: string | null` as its LAST field, positioned after `cancelledAt`. No other field of the interface is added, renamed, split, reordered, or retyped; `EmployeeProfile`, `LeaveBalanceView`, `LoginResponse`, `CreateLeaveRequestInput` and the enums are untouched. The field name, type and nullability mirror the backend `LeaveRequest.reversesRequestId` exactly, so the read model stays a faithful projection of the service's returned object. No client-side reversal logic is introduced: `leave.service.ts` (`ILeaveService`/`LeaveService`), `leave.actions.ts` and `leave.validation.ts` keep their existing method set and behaviour — the field only flows through the type, and the API client passes it through unchanged.

**Divergence from the plan worth noting:** the phase spec asserted "no test file changes this phase", but the committed diff also updates five existing test files — `web/src/modules/approvals/approvals.service.test.ts`, `web/src/modules/leave/leave.service.test.ts`, and `web/src/presentation/pages/{ApprovalsPage,LeaveDetailPage,LeaveListPage,RequestLeavePage}.test.tsx` — each adding `reversesRequestId: null` to its `LeaveRequestView` fixture builder. These are mechanical fixture completions forced by the new required field (the fixtures are typed as `LeaveRequestView`), not new test cases: no test file is added or deleted and no assertion changes. Without them `tsc` would fail on the web root.

**Read-path behaviour (unchanged, now consumable):** `GET /leaves` and `GET /leaves/:id` continue to return both the original APPROVED row (`reversesRequestId` = null) and its CANCELLED reversal row (`reversesRequestId` = the original's id) as two independent entries, with role scoping and error semantics unchanged. The client pairs them via `reversesRequestId`; neither row is suppressed, collapsed, or filtered. No query parameter or route-level mapping was added. The "GET /leaves list shape" open question remains open: every existing consumer (LeaveListPage, ApprovalsPage, DashboardPage) still renders two rows unless it learns to filter on `reversesRequestId`.

### Phase 4 delivered (reversal unit test + smoke assertion)
This phase delivers recommended Phase 4 — the GP-008 reversal test coverage. Two files changed, both test-only; no production source was touched (the Phase 1–3 deliverables are fixed contracts).

**Unit test — `tests/unit/modules/leave/leave.service.test.ts`.** A new `describe('cancel (APPROVED reversal)')` block extends the existing suite, reusing the eight in-memory fakes and fixtures. `FakeLeaveRepository.findByReversesRequestId` now records its calls (`findReversesCalls`) and forwards the optional `client`, so the reversal lookup is assertable. The block's own `beforeEach` seeds an APPROVED request with `usedDays = REQUESTED_DAYS` (the existing cancel `beforeEach` seeds `usedDays: 0`, which would not exercise the release path) and clears the recorded-call arrays before each case. Cases:
- **Original immutability** — `repository.updateCalls` is empty; the stored original is the same object and still reads APPROVED with `approverId`/`approvalComment`/`decidedAt` byte-identical; no update call targets the original id.
- **Reversal shape** — exactly one `repository.create` call; the new row is CANCELLED with `reversesRequestId === original.id`, copies `employeeId`/`leaveTypeCode`/`startDate`/`endDate`/`requestedDays`/`reason` verbatim, nulls `approverId`/`approvalComment`/`submittedAt`/`decidedAt`, and sets `cancelledBy = actor.id` with `cancelledAt` a `Date`.
- **Exactly-once release** — exactly one balance update, `usedDays` back to 0, `pendingDays` `undefined` in the change set.
- **Audit** — exactly one `AuditAction.CANCEL` record with `entityId = original.id`, `beforeState = original`, `afterState = reversal`.
- **Notification** — exactly one cancellation notification (`type 'leave_request'`, title `'Leave request cancelled'`, recipient the requester, `relatedEntityId = 'lr-1'`).
- **Transaction containment** — `uow.callCount === 1`; `findByReversesRequestId`, `create`, the balance read (`forUpdate` true) and write, the audit record and the notification create all receive the single stub `PoolClient`.
- **Double-cancel guard** — with a pre-existing reversal row, `cancel` throws `ConflictError` (asserted `statusCode: 409`) and performs no insert, no balance write, no audit and no notification.
- **DRAFT/SUBMITTED unchanged** — both cancel in place (`repository.update` on the same id), create no reversal row, and leave `reversesRequestId` null.

**Smoke — `scripts/smoke.js` (Postgres mode).** A new **stage 7b** drives the full reversal flow against real Postgres: it mints an ADMIN token via the existing `signToken` helper, submits then approves the seeded request, then cancels it. It asserts the cancel response is a NEW CANCELLED row whose `reversesRequestId` equals the original id (and whose id differs from the original), that `GET /leaves/:id` still returns the original as APPROVED with its `approverId`/`decidedAt` unchanged, that `GET /leaves` includes a CANCELLED row referencing the original, and that the reversal row is independently readable by id (`GET /leaves/:id` on the NEW row returns CANCELLED with `reversesRequestId` still pointing at the original). A second cancel of the already-reversed original is asserted to return **409**. The balance release is checked by reading `leave_balances` directly: the stage captures `used_days` immediately after approval (asserting it equals the original's `requestedDays`), then after cancellation asserts `used_days === usedDaysAfterApprove - originalRequestedDays` — i.e. released exactly once, back to its pre-approval value — with `pending_days` untouched. The stage runs **before** stage 8 re-keys `bal-1` to the current period, because after the re-key no balance exists for the request's 2030 period and the release would fail with `NotFoundError`. The seed block now inserts a second `employees` row (`smoke-admin`, `EmployeeRole.ADMIN`) alongside the seeded employee, because approving/cancelling writes `actor.id` into `approver_id`, which is FK-constrained to `employees`; one ADMIN may both approve and cancel. The existing stages and the sqlite-mode skip caveat are untouched.

**Follow-up hardening (later sub-phase, `scripts/smoke.js` only).** Stage 7b was subsequently strengthened without touching production source or the unit test. The balance-release assertion no longer compares `used_days` to a bare literal `0`: it captures `used_days` after approval and asserts it equals the original's `requestedDays` (proving approval moved exactly that many days into `usedDays`), then asserts the post-cancel value is `usedDaysAfterApprove - originalRequestedDays`, so "released exactly once" is proven against the original's own `requestedDays` rather than an assumed starting value. The stage also gained two assertions: the reversal row is read back independently via `GET /leaves/:id` (exercising the read path on the NEW row, where stage 7 covered the original), and a second `POST /leaves/:id/cancel` on the already-reversed original must return **409**. The stage still runs before stage 8's re-key and still reads `leave_balances` directly via the per-run-schema knex connection.

**Divergences from the plan worth noting:**
- The plan scoped Phase 4 to "2 files"; the committed diff matches (the unit test and `scripts/smoke.js`).
- The plan's unit-test constraint required the reversal tests to seed `usedDays = REQUESTED_DAYS`; the implementation does so in the block's own `beforeEach` while leaving the existing cancel `beforeEach` (`usedDays: 0`) intact.
- The plan required the smoke actor to be an ADMIN; the implementation seeds a dedicated ADMIN employee row rather than reusing the seeded employee (whose `manager_id` is null, so no direct manager exists), and reuses the existing `SMOKE_PASSWORD`/`signToken` pattern with no hardcoded credential.
- The plan's success criterion described the balance check as "`usedDays` back to its pre-approval value"; the follow-up hardening makes that literal — it captures the post-approval value and subtracts the original's `requestedDays` instead of asserting a hardcoded `0`.
### Open questions

1. **CANCEL audit `entityId` target** — **resolved by the implementation**: `entityId` = the ORIGINAL APPROVED request id, `beforeState` = the original, `afterState` = the reversal row.
2. **Reversal-row approval provenance** — **resolved by the implementation**: the reversal row carries null `approverId`/`approvalComment`/`submittedAt`/`decidedAt`; provenance is reached via `reversesRequestId`. A reader filtering on `approverId`/`decidedAt` will not see the reversal.
3. **GET /leaves list shape** — still open: the read path returns both rows unchanged, paired by `reversesRequestId`. Every existing consumer (LeaveListPage, ApprovalsPage, DashboardPage) will render two rows unless it learns to filter.
4. **Aggregation double-counting** — **still open.** The reversal row copies `requestedDays`/dates from the original (never re-derived, never zeroed), so any aggregation that sums `requestedDays` must filter on `reverses_request_id IS NULL` or the original APPROVED row and its reversal row are double-counted. The constraint is correct and binding feature-wide; what is NOT resolved is the hazard it describes — **no aggregation exists yet and nothing enforces the filter** (verified: no `SUM(requested_days)` anywhere in `src/`). It returns to `still open` because a constraint written down is not a constraint enforced.
5. **Double-cancel guard** — **resolved by the implementation**: the service `findByReversesRequestId` check throws `ConflictError` (409) before any write, with the UNIQUE index as the DB backstop.

### Stack compliance

TypeScript on Node 20, npm, Jest, Fastify, React (Vite SPA), PostgreSQL, modular monolith. The migration targets PostgreSQL (the declared database); the smoke check runs against real Postgres. No framework outside the declared stack is used.

