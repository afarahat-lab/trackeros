# Architecture Decisions — trackeros

## ADR-001 — Project initialised

Date: 2026-06-10
Status: Accepted

Decision: Project initialised via the Gestalt platform.
Description: Trackeros — a corporate operations web and mobile platform for
  mid-sized companies. Provides employee self-service (leave
  requests, balances, expense claims), manager workflows
  (approvals, team views, time-off calendars), and HR admin
  surfaces (leave policy configuration, balance accruals,
  audit reports).
  
  Backend: TypeScript on Node 20 (Fastify), PostgreSQL via
  Knex migrations + a thin repository layer, BullMQ for
  background jobs (accrual schedulers, notification fanout).
  Module structure: src/modules/<name>/<name>.{model,
  repository,service,controller,routes}.ts. Domain modules
  include leave, balance, employee, policy, notification.
  Shared utilities under src/shared/ (db connection, base
  repository, error types).
  
  Frontend: React + Vite SPA for the web client, React Native
  for the mobile client (shared @trackeros/contracts package
  for the typed REST surface). Auth via JWT against the
  backend's /auth endpoints; identity comes from corporate
  OIDC in production and from local users in development.
  
  Tests: Vitest for unit + integration. CI on GitHub Actions
  runs lint (ESLint) + typecheck (tsc --noEmit) + unit tests +
  a Semgrep security pass on every PR. Conventional Commits +
  squash-merge. Strict TypeScript (no implicit any, strict
  null checks).
Stack: TypeScript / Node.js / React / PostgreSQL
Architecture: Modular monolith (corporate-ops-web-mobile template, tier 1)

## ADR-002 — Balance row locking for read-then-write, and create atomicity

Date: 2026-09-14
Status: Accepted

Decision: A service that reads a row inside a transaction and then writes it must take a
row-level lock on the read (`SELECT ... FOR UPDATE`), and a state change plus its audit record
must share one unit of work.

Context: The leave-balance counters (`pendingDays`, `usedDays`) are computed in application
code — read the row, adjust, write the result. PostgreSQL's default READ COMMITTED isolation
permits two concurrent transactions to read the same value and compute the same delta, so the
second write silently discards the first; being inside a transaction is not sufficient.
Separately, `LeaveService.create` wrote its DRAFT row and its CREATE audit entry outside any
transaction, so a failing audit insert left a persisted request with no audit trail (GP-002).

Consequences:
- `IBalanceRepository.findByKey` / `findById` take an optional `forUpdate` flag; the lock clause
  is emitted only when an explicit `PoolClient` is supplied (a lock taken outside a transaction
  is released immediately and buys nothing). `LeaveService.submit` / `approve` / `reject` /
  `cancel` pass `forUpdate = true` before writing the balance; `create`'s validation-only read
  passes `false`.
- `LeaveService.create` now runs the insert and its audit record inside one
  `uow.withTransaction`, with the client forwarded to both.
- `LeaveService.approve` / `reject` assert `pendingDays >= requestedDays` before decrementing
  (`ConflictError` otherwise), so a lost update cannot drive the counter negative.

Note: the same phase landed the schema/repository groundwork for the GP-008 reversal feature —
the nullable `reverses_request_id` self-FK column plus its partial unique index, the
`reversesRequestId` model field, `ILeaveRepository.findByReversesRequestId`, and
`AuditAction.REVERSE`. The APPROVED reversal branch in `LeaveService.cancel` was NOT part of
that phase; it is implemented in ADR-003 below.

## ADR-003 — GP-008: an approved leave request is reversed, not mutated

Date: 2026-09-15
Status: Accepted

Decision: Cancelling an APPROVED leave request performs NO update on the approved row. It
inserts a NEW `leave_requests` row with `status = CANCELLED` whose `reversesRequestId` points at
the original, releases the balance exactly once, and writes two REVERSE audit records — all
inside a single unit of work. DRAFT and SUBMITTED cancellation keep their existing in-place
behaviour.

Context: GP-008 — a completed approval is immutable. `LeaveService.cancel` previously mutated
the request in place for every status, so cancelling an APPROVED request overwrote the
approver's decision (`approverId`, `approvalComment`, `decidedAt`) and erased the fact that an
approval had ever happened. The Phase 1 groundwork (ADR-002 note) added the storage and
repository support; this decision is the write path that uses it.

Implementation — `src/modules/leave/leave.service.ts`, `LeaveService.cancel` (the only
production file changed):

- Pre-transaction guards are unchanged and still run before the transaction for every status:
  `assertAuthenticated`, `assertCanCancel` (the owner may cancel their own DRAFT/SUBMITTED; an
  APPROVED request only by the requester's direct manager or an ADMIN), and the
  `startOfUtcDay` timing guard (`ConflictError` once `startDate <= today`).
- DRAFT / SUBMITTED — unchanged in-place behaviour: `repository.update(requestId, { status:
  CANCELLED, cancelledBy, cancelledAt })`; SUBMITTED additionally releases `pendingDays` by
  `requestedDays`; exactly one `AuditAction.CANCEL` record and one notification; no new row.
- APPROVED — a new branch inside the same `uow.withTransaction`:
  - **Guard first**: `repository.findByReversesRequestId(requestId, client)`; an existing
    reversal throws `ConflictError('Leave request has already been reversed')` (409) rather than
    returning an idempotent 200. The repository's Postgres `23505` → `ConflictError` mapping is
    the concurrency backstop behind the partial unique index.
  - **Balance release exactly once**: `resolveBalance(..., client, forUpdate = true)` then
    `balanceRepository.update(balance.id, { usedDays: balance.usedDays - request.requestedDays },
    client)`. `pendingDays` is untouched. The released quantity is always read from the ORIGINAL
    row's `requestedDays` — never re-derived from the dates.
  - **Insert the reversal row** via `repository.create`: `employeeId`, `leaveTypeCode`,
    `startDate`, `endDate` copied verbatim from the original (a self-describing row);
    `requestedDays: 0`; `status: CANCELLED`; `cancelledBy: actor.id`; `cancelledAt: now`;
    `reversesRequestId: requestId`; and `reason`, `approverId`, `approvalComment`, `submittedAt`,
    `decidedAt` all `null` (the reversal was never itself approved).
  - **The original row is not updated at all** — its status stays APPROVED and
    `approverId`/`approvalComment`/`decidedAt` are untouched; `cancelledBy`/`cancelledAt` stay
    `null` on the original.
  - **Two `AuditAction.REVERSE` records** in the same transaction: one anchored on the original
    (`beforeState` = the APPROVED row, `afterState` = `{ ...request, status: CANCELLED }`), one
    on the reversal row (`beforeState: null`, `afterState` = the reversal row) — so neither row
    is left unaudited.
  - **One notification** to `request.employeeId`, `relatedEntityType: 'leave_request'`,
    `relatedEntityId` = the NEW reversal row id.
  - Returns the NEW reversal row (not the original).

Divergences from the reconciled architecture (feature `b9cdf0f5`) worth noting:
- The reconciled architecture's business-rules bullet said the reversal row copies
  `requestedDays` verbatim from the original; the implementation stores `requestedDays: 0`, per
  the phase spec's explicit constraint — the released quantity is always read from the original
  via `reversesRequestId`, and a zero makes double-counting structurally impossible.
- The reconciled architecture's audit bullet said "exactly one CANCEL AuditLog per cancellation"
  with `entityId` = the new reversal row id; the implementation writes TWO `AuditAction.REVERSE`
  records (one per row), per the phase spec's success criteria and entity invariants.
- Resolved spec ambiguities: the notification reuses the existing cancellation title/message
  verbatim (`'Leave request cancelled'` / `'Your leave request <id> was cancelled.'`) referencing
  the ORIGINAL request id; the audit `actorId` is `actor.id` (the cancelling manager/ADMIN); the
  duplicate-reversal guard runs FIRST, before the balance read/release.

Not yet delivered (PLAN.md Phases 3–4): read-model exposure of `reversesRequestId` on the wire
and the optional originals/reversals query filter; unit tests for the reversal branch; the
`scripts/smoke.js` end-to-end proof against real Postgres; and the date-occupancy rule (a
reversed original no longer occupies its dates).

Open consistency flag: the web client's `getAvailableLeaveActions(status, role, isOwner)` treats
`CANCELLED` as terminal and `APPROVED` as non-cancellable for the owner. After this change an
APPROVED request IS cancellable by a manager/ADMIN while the original keeps reading APPROVED, so
the client must key off `reversesRequestId`, not `status` alone.
