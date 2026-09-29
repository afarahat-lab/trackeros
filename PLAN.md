# PLAN.md

## Phase 1: Phase 1 — reverses_request_id column, model field, repository plumbing (~3 files)

Deliver the persistence + domain-model foundation for GP-008 reversal. This phase creates approximately 3 files and touches two modules only: `migrations` and `leave`.

FILES (exact paths):
1. `migrations/<timestamp>_add_reverses_request_id_to_leave_requests.js` (NEW, module `migrations`) — knex migration adding a nullable `reverses_request_id` column to `leave_requests` (`t.text('reverses_request_id').nullable()`), a self-referencing FK to `leave_requests.id`, and a UNIQUE index on `reverses_request_id` (the database backstop for "an APPROVED request cannot be cancelled twice" — the partial/unique index is the belt to the service's braces). `exports.down` drops the index, the FK and the column. Targets PostgreSQL (the declared database). In the migration comment, record the BINDING rule that any aggregation summing `requested_days` MUST filter on `reverses_request_id IS NULL`, because a reversal row copies the original's `requestedDays` verbatim (never re-derived, never zeroed).
2. `src/modules/leave/leave.model.ts` (EDIT, module `leave`) — add `reversesRequestId: string | null` as the LAST field of the canonical `LeaveRequest` interface (null for every ordinary request; non-null only on a reversal row). `CreateLeaveRequestInput` stays `Omit<LeaveRequest, 'id'>`, so `create` now supplies `reversesRequestId`. Do NOT add, rename, split or reorder any other field — the canonical shape is id, employeeId, leaveTypeCode, startDate, endDate, requestedDays, reason, status, approverId, approvalComment, submittedAt, decidedAt, cancelledBy, cancelledAt, reversesRequestId. `reversesRequestId` is consumed by the leave module only and is NOT promoted to `src/shared/types/`.
3. `src/modules/leave/leave.repository.ts` (EDIT, module `leave`) — carry `reverses_request_id` end-to-end in `PgLeaveRequestRepository`: add it to the `COLUMNS` constant, to the `LeaveRequestRow` interface, to `mapRow`, and to the `create` INSERT column/value list (15 values). Add `findByReversesRequestId(reversesRequestId: string, client?: PoolClient): Promise<LeaveRequest | null>` to the `ILeaveRepository` interface (declared inline in this file, the balance convention) and implement it with `WHERE reverses_request_id = $1`, returning `null` when absent (the repository does not throw — the service decides error semantics). Every method keeps the optional trailing `PoolClient` and the private `db(client)` fallback; the repository never opens BEGIN/COMMIT/ROLLBACK. Do NOT add `reversesRequestId` to `FIELD_COLUMNS` — the column is set at INSERT time only and is never updated.

DEPENDENCIES: read `src/modules/leave/leave.model.ts` and `src/modules/leave/leave.repository.ts` before editing; read `migrations/20260913000000_initial_schema.js` for the `leave_requests` DDL and the existing migration conventions, and `migrations/20260913000001_add_password_hash_to_employees.js` for the alter-table style. `UpdateLeaveRequestDto` and the canonical enums come from `src/shared/types/index.ts` (unchanged this phase).

OUT OF SCOPE (deferred to later phases — do not build, do not require as a success criterion): the `LeaveService.cancel` reversal branch (Phase 2), the web `LeaveRequestView` field (Phase 3), and the reversal unit test / smoke assertion (Phase 4). No service, route, or test file changes this phase.

SUCCESS: `npm run build` (tsc) clean; the migration applies against real Postgres; existing Jest suite still passes.

## Phase 2: Phase 2 — LeaveService.cancel reversal branch (GP-008) (~1 files)

Deliver the GP-008 reversal branch in the leave orchestrator. This phase edits approximately 1 file: `src/modules/leave/leave.service.ts` (module `leave`). No other production file changes.

DEPENDS ON PHASE 1 — read `src/modules/leave/leave.model.ts` (the `LeaveRequest` interface now ends with `reversesRequestId: string | null`) and `src/modules/leave/leave.repository.ts` (`ILeaveRepository.findByReversesRequestId`, the `COLUMNS`/`LeaveRequestRow`/`mapRow`/`create` plumbing for `reverses_request_id`) BEFORE generating any code that references those types or methods. Do not assume field names — read them.

IMPLEMENTATION — `LeaveService.cancel(actor, requestId)` gains a reversal branch, keeping the existing DRAFT/SUBMITTED behaviour byte-identical:
- DRAFT and SUBMITTED: unchanged in-place behaviour (status → CANCELLED with `cancelledBy = actor.id`, `cancelledAt = now`; DRAFT touches no balance, SUBMITTED releases `pendingDays -= requestedDays`). No completed approval exists in those states, so GP-008 does not apply.
- APPROVED: the approved row is IMMUTABLE — its `status`, `approverId`, `approvalComment` and `decidedAt` must not be written at all. Instead INSERT a NEW `leave_requests` row (the reversal role of `LeaveRequest`, NOT a separate table) via `repository.create` with: `reversesRequestId = original.id` (non-null), `employeeId`, `leaveTypeCode`, `startDate`, `endDate`, `requestedDays` and `reason` copied VERBATIM from the original (`requestedDays` is copied, never re-derived and never zeroed), `status = LeaveStatus.CANCELLED`, `approverId = null`, `approvalComment = null`, `submittedAt = null`, `decidedAt = null` (the reversal was never approved — copying the approver would read as a second approval decision and double-count in any "decided in this period" report), `cancelledBy = actor.id`, `cancelledAt = now`.
- Balance release: unchanged and exactly once — `update(id, { usedDays: usedDays - requestedDays }, client)` on the ORIGINAL request's `requestedDays`, inside the same transaction. Do not double-release and do not skip the release.
- Double-cancel guard (BOTH guards, belt and braces): inside the transaction call `repository.findByReversesRequestId(original.id, client)` and throw `ConflictError` (409) when a reversal already exists; the Phase 1 partial UNIQUE index on `reverses_request_id` is the database backstop. A reversal row is terminal and can never itself be cancelled.
- Audit: still exactly ONE `AuditAction.CANCEL` record, written inside the same transaction, with `entityId = the ORIGINAL APPROVED request's id`, `beforeState = original`, `afterState = reversal` (an auditor reconstructing the cancellation from `audit_logs` alone finds it on the row that was cancelled).
- Notification: still exactly one cancellation notification to the requester, inside the same transaction.
- Atomicity: the reversal insert, the balance release, the audit write and the notification all join ONE `uow.withTransaction` callback, with the `PoolClient` threaded through every repository/service call. BEGIN/COMMIT/ROLLBACK stay exclusively in `PgUnitOfWork`.

Do NOT change `ILeaveService.cancel`'s signature, the route, or any other operation. Do NOT add client-side or read-path logic.

OUT OF SCOPE (deferred — do not build, do not require as a success criterion): the web `LeaveRequestView.reversesRequestId` field (Phase 3) and the reversal unit test + smoke assertion (Phase 4). No test file changes this phase.

SUCCESS: `npm run build` (tsc) clean; existing Jest suite still passes.

## Phase 3: Phase 3 — expose reversesRequestId on the read model (wire + web) (~2 files)

Expose `reversesRequestId` on the read model so a client can tell the original APPROVED row from its CANCELLED reversal row. This phase edits approximately 2 files across two modules: `web-shared-types` and `leave`.

DEPENDS ON PHASE 1 — read `src/modules/leave/leave.model.ts` (the `LeaveRequest` interface now ends with `reversesRequestId: string | null`) and `src/modules/leave/leave.repository.ts` (`COLUMNS`/`LeaveRequestRow`/`mapRow` now carry `reverses_request_id`) BEFORE generating any code that references that field. Do not assume the field name — read it.

FILES (exact paths):
1. `web/src/shared/types/index.ts` (EDIT, module `web-shared-types`) — add `reversesRequestId: string | null` as the LAST field of the `LeaveRequestView` interface, after `cancelledAt`. This is the frontend read model and it is cross-module on the web root (`web-leave`, `web-approvals`, `web-presentation-pages` all import it), so it belongs here and NOT in a single-purpose module. Do not add, rename, split or reorder any other field of `LeaveRequestView`; do not touch `EmployeeProfile`, `LeaveBalanceView`, `LoginResponse`, `CreateLeaveRequestInput`, or any enum.
2. `src/modules/leave/leave.routes.ts` (EDIT, module `leave`) — the read endpoints `GET /leaves` and `GET /leaves/:id` already return the service's `LeaveRequest` objects; confirm the new field flows through unchanged (the repository's `mapRow` supplies it, so no route-level mapping is added). Do NOT add a query param, do NOT suppress or collapse either row, and do NOT change the read path's role scoping: `GET /leaves` returns BOTH the original APPROVED row and its CANCELLED reversal row as two independent entries, and the client pairs them via `reversesRequestId`. Suppressing the original would break the immutable-row-is-still-readable contract that GP-008 exists to protect. If no route change is required, leave the file untouched rather than inventing one.

Do NOT introduce any client-side reversal logic: `web/src/modules/leave/leave.service.ts` (`ILeaveService`/`LeaveService`), `leave.actions.ts` and `leave.validation.ts` keep their existing method set and behaviour — the new field simply flows through `LeaveRequestView`.

OUT OF SCOPE (deferred — do not build, do not require as a success criterion): the reversal unit test and smoke assertion (Phase 4). No test file changes this phase.

SUCCESS: `npm run build` (tsc) clean for both application roots; existing Jest suite still passes.

## Phase 4: Phase 4 — tests: reversal unit test + smoke assertion (~2 files)

Prove the GP-008 invariant end-to-end. This phase creates/edits approximately 2 files: the leave service unit test and the smoke script. No production source changes — the Phase 1–3 deliverables are fixed contracts.

DEPENDS ON PHASES 1–3 — read `src/modules/leave/leave.model.ts` (`LeaveRequest.reversesRequestId`), `src/modules/leave/leave.repository.ts` (`ILeaveRepository.findByReversesRequestId`, `COLUMNS`/`mapRow`/`create`), `src/modules/leave/leave.service.ts` (the `cancel` reversal branch) and `web/src/shared/types/index.ts` (`LeaveRequestView.reversesRequestId`) BEFORE writing assertions. Do not assume field names or method names — read them.

FILES (exact paths):
1. `tests/unit/modules/leave/leave.service.test.ts` (EDIT, module `leave`) — extend the existing suite with a reversal describe block, reusing the existing eight in-memory fakes (`FakeLeaveRepository`, `FakeBalanceRepository`, `FakeAuditService`, `FakeNotificationService`, `FakeValidationService`, `FakeEmployeeService`, `FakePolicyService`, `FakeUnitOfWork`) and the existing fixtures (`makeRequest`, `makeActor`, `makeBalance`, `makeEmployee`, `makePolicy`). The `FakeLeaveRepository` must gain `findByReversesRequestId` (returning `null` by default, and the previously-created reversal when set) so it still satisfies `ILeaveRepository`. Assertions:
   - After cancelling an APPROVED request the ORIGINAL row still reads `status === LeaveStatus.APPROVED` with its `approverId`, `approvalComment` and `decidedAt` byte-identical (assert the original object was never passed to `update`), while a NEW row is created with `status === LeaveStatus.CANCELLED` and `reversesRequestId === original.id`.
   - The reversal row copies `employeeId`, `leaveTypeCode`, `startDate`, `endDate`, `requestedDays` and `reason` verbatim from the original, and sets `approverId`, `approvalComment`, `submittedAt`, `decidedAt` all to `null`, with `cancelledBy = actor.id` and `cancelledAt` set.
   - The balance release is exactly once, on the ORIGINAL's `requestedDays` (`usedDays -= requestedDays`), with `pendingDays` untouched.
   - Exactly one `AuditAction.CANCEL` entry with `entityId === original.id`, `beforeState === original`, `afterState === reversal`; exactly one cancellation notification.
   - The double-cancel guard: when `findByReversesRequestId` returns an existing reversal, `cancel` throws `ConflictError` (409) and performs no insert, no balance write, no audit and no notification.
   - DRAFT/SUBMITTED cancellation is unchanged in place (no reversal row created, `reversesRequestId` stays `null`).
   - Containment-based transaction assertions: all steps occur inside the single `withTransaction` callback with the stub `PoolClient` forwarded to every participating call.
2. `scripts/smoke.js` (EDIT) — extend the Postgres-mode stages with a reversal assertion: create → submit → approve a request, then `POST /leaves/:id/cancel` as the direct manager/ADMIN, then `GET /leaves/:id` for the original and assert it still reads `APPROVED` with its `approverId`/`decidedAt` intact, and assert a second row exists whose `reversesRequestId` equals the original's id and whose `status` is `CANCELLED`. Assert the balance release happened exactly once (the original's `requestedDays` returned to `usedDays`). Keep the existing sqlite-mode skip caveat and the existing stages untouched.

OUT OF SCOPE: no production source edits; no new endpoints; no web test changes.

SUCCESS: `npm run build` (tsc) clean, the full Jest suite passes, and `npm run smoke` passes against real Postgres — proving that after cancelling an APPROVED request the original row still reads APPROVED while a new CANCELLED row references it.
