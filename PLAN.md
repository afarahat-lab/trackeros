# PLAN.md

## Phase 1: Phase 1 — reverses_request_id column, model field, repository plumbing (~4 files)

Deliver the persistence + type plumbing for the GP-008 reversal link. No service, route, or read-model behaviour changes in this phase.

FILES (approximately 4, plus one existing test assertion):
1. A NEW knex migration under `migrations/` (e.g. `migrations/20260914000000_add_reverses_request_id_to_leave_requests.js`), following the style of the existing `migrations/20260913000000_initial_schema.js` and `migrations/20260913000001_add_password_hash_to_employees.js`. `exports.up` alters `leave_requests` to add a NULLABLE `reverses_request_id` text column with a FK to `leave_requests.id`, PLUS a PARTIAL UNIQUE index on `reverses_request_id WHERE reverses_request_id IS NOT NULL` (this index is what makes a concurrent double-cancellation impossible rather than unlikely). `exports.down` drops the index and then the column.
2. `src/modules/leave/leave.model.ts` — read it first. Append `reversesRequestId: string | null` as the LAST field of `LeaveRequest` (the canonical 15-field shape; do not rename, split, add, or omit any other field). `CreateLeaveRequestInput` stays `Omit<LeaveRequest, 'id'>` — create supplies `reversesRequestId` (null for ordinary rows). Do NOT add a `reversedByRequestId` back-pointer to the approved row: the approved row is immutable in storage and discovery is one-directional in storage.
3. `src/modules/leave/leave.repository.ts` — read it first. Extend the existing `COLUMNS` constant, `LeaveRequestRow` type and `mapRow` helper to carry `reverses_request_id`; `create` inserts it. Do NOT add `reversesRequestId` to `FIELD_COLUMNS` — `update` must never be able to change it. Add `findByReversesRequestId(reversesRequestId: string, client?: PoolClient): Promise<LeaveRequest | null>` to `ILeaveRepository` and `PgLeaveRequestRepository` (returns null when absent, never throws — the service decides error semantics), used by the at-most-one-reversal guard. Map a Postgres `23505` unique-violation on the partial index to `ConflictError` (imported from `src/shared/errors`) so the concurrency backstop surfaces as a clean 409 rather than a raw constraint error. Keep the existing optional-trailing-`PoolClient` convention; the repository never opens BEGIN/COMMIT/ROLLBACK.
4. `src/shared/types/index.ts` — read it first. Add `REVERSE = 'REVERSE'` to the canonical `AuditAction` enum, appended after `CANCEL`. It is used ONLY for reversal instances (Phase 2). No other enum or DTO changes in this phase; `reversesRequestId` is a field of the leave-owned `LeaveRequest` entity, NOT a cross-module value type, so it must not be added here.
5. Update the existing `AuditAction` member-set assertion in `tests/unit/shared/types.test.ts` to include `REVERSE`.

DEPENDENCIES: none on prior phases. Read `src/modules/leave/leave.model.ts`, `src/modules/leave/leave.repository.ts`, `src/shared/types/index.ts`, `src/shared/errors/index.ts` and `migrations/20260913000000_initial_schema.js` before generating.

SUCCESS: `npm run build` clean, existing Jest suite green, migration applies and rolls back against real Postgres.

## Phase 2: Phase 2 — LeaveService.cancel reversal branch (GP-008) (~1 files)

Deliver the GP-008 reversal branch of `LeaveService.cancel`. ONE production file: `src/modules/leave/leave.service.ts`. No routes, no read-model changes, no tests in this phase.

READ FIRST (exact paths): `src/modules/leave/leave.model.ts` and `src/modules/leave/leave.repository.ts` (Phase 1 — `reversesRequestId` field, `findByReversesRequestId`, `23505` → `ConflictError`), `src/shared/types/index.ts` (Phase 1 — `AuditAction.REVERSE`), `src/shared/errors/index.ts`, `src/shared/date/index.ts`, `src/modules/balance/balance.service.ts`, `src/modules/audit/audit.service.ts`, `src/modules/notification/notification.service.ts`, `src/modules/employee/employee.service.ts`. Do not guess field names — read the actual type definitions.

IMPLEMENT in `LeaveService.cancel(actor, requestId)`:
- DRAFT / SUBMITTED: unchanged in-place behaviour (status → CANCELLED, `cancelledBy`/`cancelledAt` set, balance release as today). No completed approval exists in those states, so GP-008 does not apply.
- APPROVED: the approved row is IMMUTABLE in storage — its `status`, `approverId`, `approvalComment` and `decidedAt` must not change. Instead INSERT a NEW `leave_requests` row via `repository.create` with: a new `id` (repository-generated, distinct from the original), `reversesRequestId = original.id`, `employeeId`/`leaveTypeCode`/`startDate`/`endDate`/`reason` copied verbatim from the original, `status = LeaveStatus.CANCELLED`, `approverId = null`, `approvalComment = null`, `submittedAt = null`, `decidedAt = null`, `cancelledBy = actor.id`, `cancelledAt = now`, and `requestedDays = 0` (BINDING rule 5+6: a zero day-count makes double-counting structurally impossible instead of relying on every future aggregate remembering a filter; the reversal was never approved, so approval data is not copied onto it).
- RELEASE-ONCE INVARIANT (BINDING rule 4): inside the SAME `uow.withTransaction` boundary, first call `repository.findByReversesRequestId(original.id, client)` and throw `ConflictError` if a reversal already exists (the clean 409 pre-check); the partial UNIQUE index from Phase 1 is the concurrency backstop. Then release the balance EXACTLY ONCE, computed from the ORIGINAL row's `requestedDays` (never the reversal's 0): `usedDays -= original.requestedDays` via `IBalanceRepository.findByKey(..., forUpdate = true)` then `update`. Do not double-release and do not skip the release.
- AUDIT (BINDING rule 7): write TWO audit records in the same transaction, both with `action = AuditAction.REVERSE` and `entityType = 'leave_request'` — one whose `entityId` is the ORIGINAL approved request id (`beforeState` = the untouched APPROVED row, `afterState` = the new CANCELLED row), and one whose `entityId` is the NEWLY INSERTED row id (`beforeState = null`, `afterState` = the new row, carrying `reversesRequestId`). Either single choice leaves one of the two rows unaudited.
- NOTIFICATION: unchanged in shape — one cancellation notification to the ORIGINAL request's `employeeId`, with `relatedEntityType = 'leave_request'` and `relatedEntityId` = the NEW reversal instance id.
- `assertCanCancel` authorization and the `startDate <= today` timing guard are UNCHANGED (owner for DRAFT/SUBMITTED; direct manager or ADMIN for APPROVED).
- Thread the transaction `PoolClient` through every repository/service call; BEGIN/COMMIT/ROLLBACK stay exclusively in `PgUnitOfWork`.

SUCCESS: `npm run build` clean and the existing Jest suite green (the new tests land in Phase 3).

## Phase 3: Phase 3 — unit tests proving immutability and single release (~1 files)

Test-only phase. ONE file: extend `tests/unit/modules/leave/leave.service.test.ts` with a new `cancel APPROVED (GP-008 reversal)` describe block. No production source changes — the Phase 1/2 deliverables are fixed contracts.

READ FIRST (exact paths): `tests/unit/modules/leave/leave.service.test.ts` (reuse its existing eight in-memory fakes and fixtures — `FakeLeaveRepository`, `FakeBalanceRepository`, `FakeAuditService`, `FakeNotificationService`, `FakeValidationService`, `FakeEmployeeService`, `FakePolicyService`, `FakeUnitOfWork`, plus `makeRequest`/`makeActor`/`makeBalance`/`makeEmployee`/`makePolicy`), `src/modules/leave/leave.service.ts` (Phase 2), `src/modules/leave/leave.model.ts` and `src/modules/leave/leave.repository.ts` (Phase 1 — `reversesRequestId`, `findByReversesRequestId`), `src/shared/types/index.ts` (Phase 1 — `AuditAction.REVERSE`). Extend `FakeLeaveRepository` with `findByReversesRequestId` (recording calls) so it still satisfies `ILeaveRepository`.

PROVE (the acceptance criterion): after cancelling an APPROVED request the ORIGINAL row still reads APPROVED while a NEW CANCELLED row references it.
- The original row is untouched: `status` still `APPROVED`, `approverId`/`approvalComment`/`decidedAt` unchanged, and `repository.update` was NEVER called with the original id.
- A new row was inserted via `repository.create` with a distinct id, `reversesRequestId === original.id`, `status === LeaveStatus.CANCELLED`, `requestedDays === 0`, `approverId === null`, `approvalComment === null`, `submittedAt === null`, `decidedAt === null`, `cancelledBy === actor.id`, `cancelledAt` set, and `employeeId`/`leaveTypeCode`/`startDate`/`endDate`/`reason` copied verbatim from the original.
- SINGLE RELEASE: `usedDays` decremented by exactly the ORIGINAL row's `requestedDays` (not the reversal's 0), exactly one balance `update` call, and the balance row read with `forUpdate = true` before the write.
- RELEASE-ONCE GUARD: when `findByReversesRequestId` returns an existing reversal, `cancel` throws `ConflictError` and performs no insert, no balance write, no audit write.
- AUDIT: exactly TWO `AuditAction.REVERSE` entries — one with `entityId === original.id` (`beforeState` = the APPROVED row, `afterState` = the new CANCELLED row) and one with `entityId === newRow.id` (`beforeState === null`).
- NOTIFICATION: one cancellation notification to the original's `employeeId` with `relatedEntityId === newRow.id`.
- ATOMICITY: containment-based assertions in the existing style — `uow.callCount === 1` and the stub client forwarded to every participating repository/service call.
- Regression: the existing DRAFT/SUBMITTED in-place cancel tests still pass unchanged.

SUCCESS: `npx jest tests/unit/modules/leave` green and `npm run build` clean.

## Phase 4: Phase 4 — read-model exposure + smoke proof against real Postgres (~2 files)

Deliver the honest wire contract for a two-row reversal plus the end-to-end proof against real Postgres. Approximately 2–3 files.

READ FIRST (exact paths): `src/modules/leave/leave.service.ts` (Phase 2 — the reversal branch), `src/modules/leave/leave.routes.ts`, `src/modules/leave/leave.repository.ts` (Phase 1 — `findByReversesRequestId`, `reverses_request_id` in `COLUMNS`/`mapRow`), `src/modules/leave/leave.model.ts` (Phase 1 — `reversesRequestId`), `src/shared/types/index.ts` (`LeaveRequestQueryParams`), `scripts/smoke.js`.

1. `src/modules/leave/leave.service.ts` — read-model exposure on the existing read paths (`list`, `getById`); no writes, no transaction.
   - `reversesRequestId` is exposed on every returned row (it already rides along on the entity — do not strip it).
   - DERIVED `isReversed` boolean on the ORIGINAL APPROVED row (BINDING rule 3): resolved by the READ PATH, never stored, never a column. For each returned row that is APPROVED, resolve whether a reversal exists (via `repository.findByReversesRequestId(row.id)` or an equivalent read-path lookup) and attach `isReversed: true|false`. A client fetching one APPROVED request must not need a second query to learn it has been reversed.
   - LIST DEFAULT (BINDING rule 2): return BOTH rows by default — do not hide rows by default, because a wire contract that silently omits state is how a client ends up believing an approved request is still live. Add an optional `excludeReversals` query flag that, when true, filters out rows whose `reversesRequestId` is non-null. Document in a code comment that an unfiltered count double-counts a reversed request.
   - If `LeaveRequestQueryParams` needs the new flag, add `excludeReversals?: boolean` to it in `src/shared/types/index.ts` (the module that owns that DTO) — do not declare a local duplicate.
2. `src/modules/leave/leave.routes.ts` — extend the existing `parseQuery` helper to parse `excludeReversals` from the wire (`'true'`/`'false'`; anything else → `ValidationError` 400) and pass it through to `leaveService.list`. `GET /leaves` and `GET /leaves/:id` keep their existing conventions (no controller, `resolveActor` at the API boundary, `sendError` mapping). No new endpoints.
3. `scripts/smoke.js` — extend the existing Postgres-mode stages with the GP-008 proof: create → submit → approve a request, then `POST /leaves/:id/cancel` as the direct manager/ADMIN, then assert against real Postgres that (a) `GET /leaves/:id` for the ORIGINAL id still returns `status === 'APPROVED'` with `isReversed === true`, (b) a NEW row exists with `status === 'CANCELLED'` and `reversesRequestId === originalId`, (c) `GET /leaves` returns both rows by default and only the original when `excludeReversals=true`, and (d) the balance `usedDays` was released exactly once (the original's `requestedDays` returned, not double-released). Gate the new stages to Postgres mode with the existing sqlite caveat, and assert real values, not just status codes.

SUCCESS: `npm run smoke` passes against real Postgres, `tsc` is clean, and the full Jest suite is green.
