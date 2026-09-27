# PLAN.md

## Phase 1: Phase 1 — Schema + model + repository: reverses_request_id

Add the nullable `reverses_request_id` column, the `reversesRequestId` model field, and the repository support that the reversal branch needs. Approximately 4 files.

1. CREATE `migrations/<timestamp>_add_reverses_request_id_to_leave_requests.js` (knex, portable pg + sqlite3 like `migrations/20260913000000_initial_schema.js` — read that file first for the exact style). `up`: add a nullable string column `reverses_request_id` to `leave_requests` with a self-referencing FK to `leave_requests.id`, then create a PARTIAL UNIQUE index on `reverses_request_id` WHERE `reverses_request_id IS NOT NULL` (binding rule 6: the index is what makes a concurrent double-cancellation impossible). `down`: drop the index, then the column.

2. EDIT `src/modules/leave/leave.model.ts` — add the 15th field `reversesRequestId: string | null;` to `LeaveRequest`, exactly as named. `CreateLeaveRequestInput = Omit<LeaveRequest, 'id'>` then carries it automatically; do not otherwise change the shape.

3. EDIT `src/modules/leave/leave.repository.ts` — add `reverses_request_id` to the `LeaveRequestRow` interface, to the `COLUMNS` constant, to `mapRow` (mapping to `reversesRequestId`), and to the `create()` INSERT column list and `$n` values. Add `findByReversesRequestId(originalId: string, client?: PoolClient): Promise<LeaveRequest | null>` to BOTH `ILeaveRepository` and `PgLeaveRequestRepository` (SELECT ... WHERE reverses_request_id = $1, return null when no row). In `create()`, map a Postgres unique-violation (`error.code === '23505'`) on the partial index to `ConflictError` from `src/shared/errors` (binding rule 6: the service guard gives the clean 409, the index is the backstop).

4. EDIT `src/shared/types/index.ts` — add `REVERSE = 'REVERSE'` to the `AuditAction` enum, distinct from `CANCEL` (binding rule: the reversal is audited as REVERSE, not CANCEL). Do not touch any other enum or DTO in this phase.

This phase depends on existing files: `migrations/20260913000000_initial_schema.js`, `src/shared/errors/index.ts`, `src/shared/db/connection.ts`. Do NOT modify `leave.service.ts`, `leave.routes.ts`, or `scripts/smoke.js` in this phase — those are later phases. No tests in this phase.

## Phase 2: Phase 2 — LeaveService.cancel: reversal branch for APPROVED

Rewrite the APPROVED branch of `LeaveService.cancel` so a completed approval is never mutated (GP-008). Approximately 1 file: `src/modules/leave/leave.service.ts`.

READ FIRST: `src/modules/leave/leave.model.ts` and `src/modules/leave/leave.repository.ts` (Phase 1 — `reversesRequestId` field, `findByReversesRequestId`, the 23505→ConflictError mapping) and `src/shared/types/index.ts` (Phase 1 — `AuditAction.REVERSE`). Do not re-declare or re-add any of those; they exist.

In `cancel(actor, requestId)`:
- DRAFT and SUBMITTED keep the CURRENT in-place behaviour exactly: `repository.update(requestId, { status: CANCELLED, cancelledBy, cancelledAt })`, the existing pendingDays release for SUBMITTED, one `AuditAction.CANCEL` record, one notification. No completed approval exists in those states, so GP-008 does not apply.
- APPROVED takes a NEW branch, inside the SAME `uow.withTransaction`:
  a. Guard: `await this.repository.findByReversesRequestId(requestId)` — if it returns a row, throw `ConflictError` (binding rule 8: a second reversal is rejected, not idempotent-200).
  b. Balance release UNCHANGED in amount and timing: resolve the balance with `forUpdate = true` and `balanceRepository.update(balance.id, { usedDays: balance.usedDays - request.requestedDays }, client)` — exactly once, in this transaction. Do not double-release, do not skip.
  c. Insert the NEW row via `repository.create(...)` with: `employeeId`, `leaveTypeCode`, `startDate`, `endDate` copied VERBATIM from the original (binding rule 4 — a self-describing row); `requestedDays: 0` (binding rule 5 — the released quantity is always read from the ORIGINAL via `reversesRequestId`; do NOT re-derive with `requestedDays(startDate, endDate)`); `status: LeaveStatus.CANCELLED`; `cancelledBy: actor.id`; `cancelledAt: new Date()`; `reversesRequestId: requestId`; and `reason`, `approverId`, `approvalComment`, `submittedAt`, `decidedAt` all `null` (binding rule 2 — the reversal was never itself approved).
  d. The ORIGINAL row is NOT updated at all — no `repository.update` call on `requestId` in this branch. Its status stays APPROVED and approverId/approvalComment/decidedAt are untouched.
  e. Write TWO audit records in this transaction (binding rule AUDIT): one with `action: AuditAction.REVERSE`, `entityId: requestId`, `beforeState: request` (the APPROVED row), `afterState: { ...request, status: LeaveStatus.CANCELLED }` (the derived post-reversal state of the original); and one with `action: AuditAction.REVERSE`, `entityId: reversal.id`, `beforeState: null`, `afterState: reversal`.
  f. Notification: `recipientId: request.employeeId`, `relatedEntityType: 'leave_request'`, `relatedEntityId: reversal.id` (the NEW row id).
  g. Return the NEW reversal row.

Keep the existing pre-transaction guards (`assertCanCancel`, the startOfUtcDay timing guard) unchanged. Do not touch `leave.routes.ts` or `scripts/smoke.js`. No tests in this phase.

## Phase 3: Phase 3 — Read-model exposure + unit tests

Expose the two-row representation on the read model and prove the service behaviour with unit tests. Approximately 3 files.

READ FIRST: `src/modules/leave/leave.model.ts` and `src/modules/leave/leave.repository.ts` (Phase 1 — `reversesRequestId`, `findByReversesRequestId`), `src/modules/leave/leave.service.ts` (Phase 2 — the APPROVED reversal branch), `src/shared/types/index.ts`, and the existing `tests/unit/modules/leave/leave.service.test.ts` for the established mocking style.

1. EDIT `src/shared/types/index.ts` — add an optional filter to `LeaveRequestQueryParams` so a client can ask for only originals or only reversals (binding rule 1+9). Name it `reversesRequestId?: string` (filter by the original it reverses) and/or a boolean `onlyReversals?: boolean` — pick ONE and use it consistently in the repository. Do not change any other DTO.

2. EDIT `src/modules/leave/leave.repository.ts` — `findByQuery` applies the new filter when present. The DEFAULT (no filter) must return BOTH rows unfiltered: do NOT hide reversal rows (binding rule 1+9 — a wire contract that silently omits state is how a client comes to believe an approved request is still live). `reversesRequestId` is already on the read model via `mapRow` from Phase 1; confirm it is returned by `findByQuery` and `findById`.

3. EDIT `docs/ARCHITECTURE.md` — record the binding rule that a reversed original NO LONGER occupies its dates: any overlap / "already on leave" check must exclude APPROVED rows that have a reversal pointing at them (binding rule 3). Also document that an unfiltered GET /leaves count double-counts a reversed request, and that `status=CANCELLED` returns BOTH in-place cancellations and reversal rows. Nothing consumes the occupancy rule yet — record it now so it is not retrofitted against the wrong assumption.

4. EDIT/ADD `tests/unit/modules/leave/leave.service.test.ts` (Jest, mocked repositories — no real DB). Assert: (a) cancelling an APPROVED request calls `repository.create` with `reversesRequestId` set to the original id, `requestedDays: 0`, `status: CANCELLED`, and `approverId`/`approvalComment`/`decidedAt`/`submittedAt` null; (b) `repository.update` is NEVER called with the original id in that branch — the original stays APPROVED; (c) `usedDays` is decremented by the original's `requestedDays` exactly once; (d) two `AuditAction.REVERSE` records are written, one per row; (e) a second cancel of the same original throws `ConflictError`; (f) cancelling a DRAFT/SUBMITTED request still updates in place with `AuditAction.CANCEL`.

Do not touch `scripts/smoke.js` — that is Phase 4.

## Phase 4: Phase 4 — Smoke proof against real Postgres

Prove the reversal end to end against real Postgres. Approximately 1 file: `scripts/smoke.js`.

READ FIRST: `scripts/smoke.js` in full (stages 1–8, the `SMOKE_DATABASE_URL` / per-run `SCHEMA` mechanism, the seeded employee/leave_type/policy/balance rows), `src/modules/leave/leave.service.ts` (Phase 2), and `src/modules/leave/leave.repository.ts` (Phase 1).

Add a new stage AFTER the existing stage 8, inside the `if (PG)` block only (sqlite mode must keep skipping persistence and say so). The stage must:
- Seed a MANAGER employee and set the seeded employee's `manager_id` to it, plus a balance row for the period covering the request's dates with enough `used_days` to absorb the release.
- Drive the real HTTP flow with `app.inject`: create a leave request as the employee, submit it, approve it as the manager, then cancel it as the manager (`POST /leaves/:id/cancel`).
- Assert the acceptance criterion directly: re-read the ORIGINAL row (via `GET /leaves/:id` or a knex SELECT) and assert its `status` is still `APPROVED` with `approverId`/`decidedAt` unchanged; assert the cancel response is a NEW row whose `status` is `CANCELLED` and whose `reversesRequestId` equals the original id, with `requestedDays === 0` and null `approverId`/`approvalComment`/`decidedAt`.
- Assert `GET /leaves` returns BOTH rows by default (binding rule 1+9), and that the balance `usedDays` was released exactly once (not twice, not zero).
- Assert a SECOND cancel of the same original returns 409 (binding rule 8).
- Assert two `audit_logs` rows with `action = 'REVERSE'` exist for the pair (one per row).

Keep the existing stages and the schema-drop cleanup intact; the new stage must not leave rows behind. `npm run smoke` with `SMOKE_DATABASE_URL` set must pass, and `tsc` must be clean.
