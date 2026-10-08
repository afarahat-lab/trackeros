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
