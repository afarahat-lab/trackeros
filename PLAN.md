# PLAN.md

## Phase 1: Phase 1 — Migration: add reverses_request_id to leave_requests

Create exactly one file: `migrations/20260914000001_add_reverses_request_id_to_leave_requests.js` (knex migration, CommonJS `exports.up` / `exports.down`, matching the conventions of the existing `migrations/20260913000000_initial_schema.js` and `migrations/20260913000001_add_password_hash_to_employees.js` — read both before generating).

`exports.up`:
1. `knex.schema.alterTable('leave_requests', (t) => { t.text('reverses_request_id'); })` — NULLABLE, `t.text` (the same column type convention the initial schema uses for `leave_requests.id`; do NOT use `t.uuid` or add a NOT NULL constraint, and do NOT add a foreign key — the column is a self-reference and the requirement only asks for the column plus an index).
2. Create a UNIQUE PARTIAL index on `leave_requests(reverses_request_id)` restricted to non-null values, e.g. `knex.raw('CREATE UNIQUE INDEX leave_requests_reverses_request_id_unique ON leave_requests (reverses_request_id) WHERE reverses_request_id IS NOT NULL')`. The partial predicate is load-bearing: every original row carries NULL and NULLs must not collide. This index is the exactly-once guarantee for a reversal (binding rule Q4).

`exports.down`: drop the index first, then the column (`DROP INDEX IF EXISTS leave_requests_reverses_request_id_unique`, then `alterTable('leave_requests', (t) => { t.dropColumn('reverses_request_id'); })`).

Add a short comment documenting that `reverses_request_id` is NULL on an original request and equals the original's `id` on a reversal row, and that a reversal row is terminal.

No TypeScript source files, no model, no repository, and no tests in this phase — the column is inert until Phase 2 maps it. This phase must leave `npm run build`, the Jest suite, and `npm run smoke` green (a nullable column addition is backward compatible with the existing repository, which does not yet select it).

## Phase 2: Phase 2 — leave model + repository: reversesRequestId end-to-end

Deliver `reversesRequestId` end-to-end through the leave module's model and repository, in approximately 3 files (plus one fixture touch-up). This phase depends on `migrations/20260914000001_add_reverses_request_id_to_leave_requests.js` from Phase 1 — read it before generating, and read the existing `src/modules/leave/leave.model.ts` and `src/modules/leave/leave.repository.ts` in full before editing.

1. `src/modules/leave/leave.model.ts` — add `reversesRequestId: string | null;` as the LAST field of the `LeaveRequest` interface (after `cancelledAt`), bringing it to the canonical 15-field shape. `CreateLeaveRequestInput = Omit<LeaveRequest, 'id'>` is unchanged in form, so it now also carries `reversesRequestId`. Do NOT add a `LeaveRequestEffectiveState` type here — that value object is derived, not persisted, and is not part of this feature's file set.

2. `src/modules/leave/leave.repository.ts` — thread the column through the existing `COLUMNS` constant, the `LeaveRequestRow` row type, the `mapRow` helper, and `create`:
   - `COLUMNS` gains `reverses_request_id` (append it last, matching the model field order).
   - `LeaveRequestRow` gains `reverses_request_id: string | null` and `mapRow` maps it to `reversesRequestId`.
   - `create` inserts the new column (15 values) from `input.reversesRequestId`.
   - Add `findByReversesRequestId(reversesRequestId: string, client?: PoolClient): Promise<LeaveRequest | null>` to `ILeaveRepository` and implement it in `PgLeaveRequestRepository` as `SELECT ${COLUMNS} FROM leave_requests WHERE reverses_request_id = $1`, returning `null` when absent (read-only, no throw — the service decides error semantics). Use the existing private `db(client)` helper so the optional trailing `PoolClient` is honored; the repository must never open BEGIN/COMMIT/ROLLBACK.
   - Do NOT add `reversesRequestId` to `FIELD_COLUMNS` / `UpdateLeaveRequestDto`: a reversal row is created, never updated, and the approved row is immutable (binding rule). `update` must remain unable to write this column.

3. `src/modules/leave/leave.service.ts` — the ONLY change in this phase is a one-line compile fix: `create()` must now supply `reversesRequestId: null` in the object it passes to `repository.create` (an original request reverses nothing). Do NOT implement the reversal branch, do NOT touch `cancel()`, and do NOT change any other method — the reversal branch belongs to Phase 3.

4. `tests/unit/modules/leave/leave.service.test.ts` — if the `makeRequest` fixture constructs a full `LeaveRequest` literal, add `reversesRequestId: null` so `tsc` stays clean. No new test cases in this phase (Phase 4 owns the reversal tests).

Success criteria: `npm run build` clean, the existing Jest suite green, `npm run smoke` green. No route change — `reversesRequestId` serializes with the model, so `GET /leaves` and `GET /leaves/:id` expose it automatically.

## Phase 3: Phase 3 — LeaveService.cancel: reversal branch for APPROVED

Deliver the GP-008 reversal branch in `src/modules/leave/leave.service.ts` — approximately 1 file, no route change, no new files. This phase depends on `src/modules/leave/leave.model.ts` and `src/modules/leave/leave.repository.ts` from Phase 2 (read both before generating, so the exact field names and the new `findByReversesRequestId` signature are visible) and on `src/modules/leave/leave.service.ts` as it exists today (read it in full — `cancel`, `assertCanCancel`, `resolveBalance`, and the existing `uow.withTransaction` usage are the contract to preserve).

Change ONLY the APPROVED branch of `LeaveService.cancel`. Everything else about `cancel` stays byte-for-byte as it is: the actor/authorization guards (`assertCanCancel` — owner may cancel own DRAFT/SUBMITTED; only the direct manager or an ADMIN may cancel an APPROVED request), the `startDate <= today` timing guard (ConflictError), the DRAFT path (no balance read or write), the SUBMITTED path (`pendingDays -= requestedDays`), the single `uow.withTransaction` wrapping the whole operation, and the client threaded through every repository/service call.

New APPROVED behaviour — the approved row is IMMUTABLE. Do NOT call `repository.update` on the original at all: its `status`, `approverId`, `approvalComment` and `decidedAt` must not be written. Instead, inside the same transaction:

1. Insert a NEW `leave_requests` row via `repository.create` with: `employeeId`, `leaveTypeCode`, `startDate`, `endDate` and `reason` copied from the original; `status: LeaveStatus.CANCELLED`; `reversesRequestId: original.id`; `requestedDays: 0` (a reversal consumes no leave — the original row remains the sole record of the span consumed); `approverId: null`, `approvalComment: null`, `decidedAt: null` (the reversal was never approved); `submittedAt: null`; `cancelledBy: actor.id`; `cancelledAt: now`. Pass the transaction client.
2. Release the balance EXACTLY ONCE, using the ORIGINAL row's `requestedDays` (not the reversal's 0): read the balance with `findByKey(..., forUpdate = true)` and `usedDays -= original.requestedDays`, then `update` with the client. Do not double-release and do not skip the release.
3. Write the existing CANCEL audit record (`AuditAction.CANCEL`, `entityType 'leave_request'`, `entityId` = the ORIGINAL request id, `beforeState` = the original row, `afterState` = the new reversal row) via `auditService.record(..., client)`.
4. Send the synchronous cancellation notification to the requester via `notificationService.create(..., client)`.

Terminality (binding rule Q4): a reversal row is terminal. `cancel` must reject any request whose `status` is already `CANCELLED` with `ConflictError` (409) before doing any work — this is what makes the unique partial index on `reverses_request_id` the complete exactly-once guarantee. Do not implement chained reversals and do not add a release ledger.

Do NOT add a `reason`/comment field to the cancel wire contract, do NOT change `leave.routes.ts` (the existing `POST /leaves/:id/cancel` handler already calls `leaveService.cancel(actor, request.params.id)`), and do NOT change `ILeaveService.cancel`'s signature. No tests in this phase — Phase 4 owns them. Success criteria: `npm run build` clean, existing Jest suite green, `npm run smoke` green.

## Phase 4: Phase 4 — Unit tests: reversal immutability + single release

Add the Jest unit tests proving reversal immutability and single balance release — approximately 1 file, test-only, no production source changes. This phase depends on `src/modules/leave/leave.service.ts` (Phase 3), `src/modules/leave/leave.model.ts` and `src/modules/leave/leave.repository.ts` (Phase 2) — read all three before generating so the reversal field names and the `findByReversesRequestId` signature are exact. Extend the existing suite at `tests/unit/modules/leave/leave.service.test.ts` (read it first — reuse its eight in-memory fakes, its `makeRequest`/`makeActor`/`makeBalance`/`makeEmployee`/`makePolicy` fixtures, and its containment-based transaction assertions; do not create a second test file and do not rewrite the existing `cancel` describe block).

Add a new describe block for the APPROVED reversal path. The `FakeLeaveRepository` must record `create` calls (with the forwarded client) and must implement `findByReversesRequestId`; `makeRequest` must carry `reversesRequestId: null` for originals.

Required cases:
- **Immutability (the acceptance test)**: cancelling an APPROVED request leaves the original row reading `status: APPROVED` with its `approverId`, `approvalComment` and `decidedAt` unchanged, and asserts the fake repository recorded ZERO `update` calls against the original id. A NEW row is created with `status: CANCELLED`, `reversesRequestId === original.id`, `requestedDays === 0`, `approverId === null`, `approvalComment === null`, `decidedAt === null`, `submittedAt === null`, `cancelledBy === actor.id`, `cancelledAt` set, and `employeeId`/`leaveTypeCode`/`startDate`/`endDate`/`reason` copied from the original.
- **Single release**: `usedDays` is decremented by exactly the ORIGINAL row's `requestedDays` (not the reversal's 0), `pendingDays` untouched, the balance read with `forUpdate = true` before the write, and exactly ONE balance `update` call — no double release, no skipped release.
- **Side effects**: exactly one CANCEL audit entry (`AuditAction.CANCEL`, `entityType 'leave_request'`, `entityId` = the original id) and one cancellation notification to the requester.
- **Atomicity**: `uow.callCount === 1` and the stub client forwarded to the reversal insert, the balance read/write, the audit record and the notification create.
- **Terminality**: cancelling a row whose `status` is already `CANCELLED` throws `ConflictError` (409) and performs no insert, no balance write, no audit and no notification.
- **Regression**: the existing DRAFT (no balance touch) and SUBMITTED (`pendingDays` release) paths still pass unchanged, and the existing authorization/timing/NotFoundError guards still hold.

Success criteria: `npm run build` clean, the full Jest suite green, `npm run smoke` green.

## Phase 5: Phase 5 — Smoke: real-Postgres reversal proof

Extend `scripts/smoke.js` with a real-Postgres end-to-end proof of the reversal — approximately 1 file, test-only, no production source changes. This phase depends on `src/modules/leave/leave.service.ts` (Phase 3), `src/modules/leave/leave.model.ts` and `src/modules/leave/leave.repository.ts` (Phase 2), and `migrations/20260914000001_add_reverses_request_id_to_leave_requests.js` (Phase 1) — read them before generating. Read `scripts/smoke.js` in full first and follow its existing stage structure, its Postgres-only gating (stages that need real Postgres are skipped with the existing caveat in sqlite mode), and its real-value assertion style (assert actual field values, not just status codes).

Add a new stage after the existing leave stages, using the login token and the seeded employee already established by the earlier stages:
1. Create a leave request, submit it, and approve it as the seeded manager/ADMIN actor so a genuine APPROVED row exists. Capture the request id from the `POST /leaves` response body (the repository generates it via `randomUUID()` — never predict it).
2. Record the balance's `usedDays` before the cancellation (via `GET /balances/me` or a direct read) so the release can be asserted as a delta.
3. `POST /leaves/:id/cancel` on the APPROVED request; assert 200.
4. **Immutability proof**: `GET /leaves/:id` for the ORIGINAL id still returns `status === 'APPROVED'` with its `approverId`/`decidedAt` intact, and `reversesRequestId === null`.
5. **Reversal proof**: `GET /leaves` returns BOTH rows — the original (APPROVED, `reversesRequestId` null) and a new row with `status === 'CANCELLED'` and `reversesRequestId === original.id`. Assert the reversal row's `requestedDays === 0`, `approverId === null`, `decidedAt === null`, and that its `startDate`/`endDate`/`leaveTypeCode`/`employeeId` match the original. Assert the two rows are distinguishable by `reversesRequestId` alone (no server-side collapsing, no query filter).
6. **Single-release proof**: the balance's `usedDays` decreased by exactly the original's `requestedDays` — once, not twice.
7. **Terminality proof**: a second `POST /leaves/:id/cancel` on the reversal row returns 409 with `code: 'CONFLICT'`.

Do not modify any file under `src/`. Success criteria: `npm run build` clean, the Jest suite green, and `npm run smoke` green against real Postgres with the new stage asserting the original row still reads APPROVED while a new CANCELLED row references it.
