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

## ADR-002 — `notifications.related_entity_code` and the entity-correlation index

Date: 2026-09-15
Status: Accepted

Decision: `notifications` gains a nullable, generic `related_entity_code` text column and the
`(related_entity_type, related_entity_id)` index, both in ONE new migration
(`migrations/20260915000000_add_related_entity_code_to_notifications.js`). The column is
nullable, has no default, and is not backfilled.

Context: the cancellation-notification feature needs the approver to see the leave type without
a second lookup, and the entity-correlation index was already documented in
`docs/ARCHITECTURE.md` but was absent from the initial migration (which creates only
`(recipient_id, status)`).

Alternatives rejected:
- Editing `20260913000000_initial_schema.js` to add the index: an applied migration is not
  rewritten; the documented-vs-built drift is fixed forward, in a new migration.
- A leave-specific column, or a new table: the column is generic — a code for whatever
  `related_entity_type` names — so `notifications` stays one concept.
- A NOT NULL column with a backfill: notifications unrelated to a coded entity, and every row
  written before this migration, legitimately carry no code.
- Adding `leave_requests` `status` / `approver_id` indexes in the same migration: the existing
  `(employee_id, status)` index already serves the pending-decisions predicate, and
  `approver_id` needs no index for that query.

Consequences: `related_entity_code` is nullable and deliberately unindexed; the repository and
service never synthesize a non-null value. The column is plumbed end-to-end through
`notification.model.ts` / `notification.repository.ts` (`Notification.relatedEntityCode`,
`NotificationRow`, `mapRow`, `COLUMNS`, the `create` INSERT column + `input.relatedEntityCode ?? null`);
`INotificationService`/`NotificationService` are unchanged. Its first production call site is the
approver cancellation notification (ADR-003).

## ADR-003 — Approver cancellation notification: recipient resolution before the unit of work, and a boolean skip marker in the audit `afterState`

Date: 2026-09-15
Status: Accepted

Decision: `LeaveService.cancel` emits a second `notificationService.create` call — to the
approver — for a SUBMITTED or APPROVED cancellation, inside the existing
`uow.withTransaction` callback with the same `client`. The recipient is resolved by a private
`resolveApproverRecipient(request): Promise<string | null>` called ONCE per cancellation,
BEFORE the transaction opens. When the resolved recipient is `null` and the request was
SUBMITTED or APPROVED, the CANCEL audit entry's `afterState` is the row spread with a single
boolean key `approverNotificationSkipped: true`; the cancellation still succeeds.

Context: the approver needs to know a request they would have decided (or did decide) was
cancelled, and the notification must be atomic with the status change. Two questions the design
left open had to be settled in code: where recipient resolution happens, and how a missing
recipient is recorded.

Alternatives rejected:
- Resolving the recipient inside the `withTransaction` callback: `IEmployeeService.getEmployeeById`
  takes no `PoolClient`, so the employee read cannot join the transaction; calling it inside the
  callback would read outside the transaction while appearing to be inside it. Resolution is
  therefore hoisted above `uow.withTransaction`, and only the notification INSERT joins it.
- Failing the cancellation when no recipient exists (ConflictError / assert-and-fail): a null
  `managerId` is a real domain case and a null `approverId` on an APPROVED row is a reachable
  legacy state; neither is an error, and neither may block a legitimate cancellation.
- Escalating to an ADMIN, broadcasting, or backfilling a recipient: the notification set is a
  function of the state change, not of who is available to receive it.
- A nested metadata object or a free-text suffix for the skip marker: a single boolean key merged
  into the existing `afterState` keeps the audit entry's shape (action, entityType, entityId,
  beforeState/afterState) unchanged and is directly assertable.
- Suppressing self-notification when the cancelling actor IS the resolved recipient: suppression
  would make the notification count conditional on actor identity; the count stays unconditional
  at two for SUBMITTED/APPROVED.
- Reading the recipient or the notification's `relatedEntityId` from the GP-008 reversal row: the
  reversal row carries `approverId = null` by construction, so that would silently drop every
  notification on the reversal path. Both are read from the ORIGINAL row.

Consequences: the approver notification is keyed to the ORIGINAL request id and carries
`relatedEntityCode = request.leaveTypeCode`; `type` stays the literal `'leave_request'` and no new
discriminator, DTO, enum member, or shared type is introduced. A missing recipient is visible in
the audit trail rather than silent, and is never repaired. The requester notification and the
CANCEL audit entry are otherwise byte-identical to before. `resolveApproverRecipient` is private
and is NOT added to `ILeaveService`. The approver notification is created `PENDING` and is not
advanced by the cancellation.

## ADR-004 — `GET /leaves/pending-decisions` is registered before `GET /leaves/:id`, and returns the `PendingDecision` projection
Decision: the new static route `GET /leaves/pending-decisions` is registered inside
`leaveRoutes(fastify)` BEFORE the existing parametric `GET /leaves/:id`, and its 200 body is a
bare array of the leave-owned `PendingDecision` projection (7 fields), not `LeaveRequest` rows.

Context: Fastify matches routes in registration order, so a static path registered after a
parametric sibling is shadowed by it. Registered after `GET /leaves/:id`, a request to
`/leaves/pending-decisions` resolves as `id = 'pending-decisions'`, reaches `getById`, and
returns 404 — a silent, order-dependent failure that no type check or unit test of the handler
would catch. Separately, the queue renders only what a decision needs, and the design's
`findPendingDecisions(actorId, actorRole)` signature would have put role scoping in the
repository.

Alternatives rejected:
- Registering the route after `GET /leaves/:id` and relying on a path-parameter constraint or a
  UUID regex on `:id`: it would make the parametric route's contract carry knowledge of every
  static sibling, and the failure mode (404) is indistinguishable from a genuinely missing
  request.
- Returning full `LeaveRequest` rows and letting the client project: it would expose
  `approverId`, `approvalComment`, `reason` and the cancellation fields to a queue view that
  renders none of them, and would make the response shape drift with the entity.
- Passing `actorId`/`actorRole` into the repository and re-expressing the role-scoped visibility
  rule in SQL: the rule already lives in `LeaveService.list`, and a second copy in the
  repository would be a second place to keep in sync. The service mirrors `list`'s branch and
  passes `employeeIds`; the repository applies only the `employeeIds` filter and the
  `status = 'SUBMITTED'` predicate.

Consequences: the route handler is a thin pass-through (`resolveActor` -> service -> 200) with no
query parsing, no role branch and no SQL, and the ordering comment in the file is load-bearing —
moving the registration below `GET /leaves/:id` breaks the endpoint. `PendingDecision` stays in
`src/modules/leave/leave.model.ts` and is exported from the module's `index.ts`; it is not
promoted to `src/shared/types/`. The endpoint is not added to `PUBLIC_PATHS`, so it requires a
valid bearer token.

**Test coverage (added by the feature's test phase, then hardened).** The ordering constraint is
no longer protected only by the comment and this ADR: `tests/unit/modules/leave/leave.routes.test.ts`
registers `leaveRoutes` and injects `GET /leaves/pending-decisions` through the real Fastify
router. The block now holds 11 cases. The original 5 assert 200 with the queue, 200 with `[]`,
401 `UNAUTHORIZED` with the service never called, the resolved actor forwarded unchanged, and a
bare array of exactly the seven `PendingDecision` fields. A follow-up hardening pass added 6
more, of which two bear directly on this ADR:

- **The ordering is now asserted for its own sake.** A case builds an instance whose service
  carries BOTH `listPendingDecisions` and a `getById` that throws `NotFoundError`; the static
  path returns 200 and `getById` is asserted `not.toHaveBeenCalled()`. Previously the ordering
  was pinned only indirectly — the 200 assertions would have failed had the parametric route
  won, but nothing named the shadowing as the cause. Registering the route after
  `GET /leaves/:id` now fails a test that says why.
- **The pass-through is pinned end to end.** A MANAGER case asserts the actor object is
  forwarded to the service unchanged (so the route does not scope the queue itself); a reversed
  fixture comes back in the same order, proving no re-sort or cap; dates are asserted as ISO
  8601 strings on the wire; and a service throw yields 500 `{ error: 'Internal Server Error' }`
  with the dependency's message absent from the body.

The projection's shape is likewise pinned by the field-set assertion, and
`LeaveService.listPendingDecisions`'s role scoping and verbatim array return are covered in
`tests/unit/modules/leave/leave.service.test.ts`.

## ADR-005 — The web approvals module exposes two queue reads: the client-filtered `getQueue()` and the server-scoped `getPendingDecisions()`

Date: 2026-09-15
Status: Accepted

Decision: `ApprovalsService` gains `getPendingDecisions()`, a verbatim pass-through to
`leaveService.listPendingDecisions()` (which delegates to `IApiClient.getPendingDecisions()` ->
`GET /leaves/pending-decisions`). The pre-existing `getQueue()` — which fetches `GET /leaves` and
filters client-side to `status === SUBMITTED && employeeId !== profile.id` — is kept unchanged,
and `ApprovalsPage` still consumes it. The module therefore exposes two queue reads with
different scoping.

Context: the backend endpoint scopes visibility by role and orders by `start_date ASC`, so the
client must not re-derive either. The layering map forbids `web-approvals -> web-infrastructure-api`,
so the read had to arrive through `web-leave`; `ILeaveService` had no suitable pass-through, so
one was added there rather than importing the api-client into approvals.

Alternatives rejected:
- Replacing `getQueue()` with `getPendingDecisions()` and rewiring `ApprovalsPage`: it would
  change the page's rendered shape (`ApprovalsQueueItem` carries `employeeName`, always `null`)
  and its tests in a phase scoped to the service surface, and the two reads are not equivalent —
  `getQueue()` excludes the viewer's own requests client-side, while the endpoint's role scoping
  includes them.
- Importing `ApiClient` into `web-approvals` to call the endpoint directly: it would add the
  `web-approvals -> web-infrastructure-api` edge the map deliberately omits.
- Re-sorting or re-filtering the endpoint's array in the service: the backend owns both the
  SUBMITTED predicate and the ordering; a second copy would be a second place to keep in sync.

Consequences: `PendingDecisionView` (7 fields) is added to `web/src/shared/types/index.ts` as the
wire projection of the backend's leave-owned `PendingDecision`; it is a client view type, not a
promotion of the backend model. `getPendingDecisions()` returns the array by identity — no copy,
no sort, no filter — and an empty queue is a normal `[]`, not an error. Widening `IApiClient` and
`ILeaveService` forced mechanical fixture completions in twelve existing test files (four module
service tests, eight presentation tests); no assertion changed. `ApprovalsPage` and the guards
are unchanged, so the new read currently has no presentation consumer.
