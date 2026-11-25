# Architecture — trackeros

_This document holds the CURRENT architecture of the system: one canonical section per
heading. It is not a history. What each feature DID — its recommended phases, its
"Phase N delivered" records, its acceptance notes — is archived verbatim, per feature,
under `.gestalt/<feature id>/architecture/history.md`, and that archive was proved
byte-for-byte reconstructible before this document replaced the appended one._

_Consolidated 2026-11-25. Before: 239,533 bytes across 14 appended feature blocks, with
10 `Cross-cutting contracts` sections, 9 `Open questions`, 8 `Dependency map`s and 7
`Module boundaries`. **53% of it was process content** — "Phase N delivered" and delivery
records alone were 123,868 bytes._

## Overview

The architecture is modular, with a clear separation of concerns between models, repositories, services, controllers, and routes. The backend is built using Fastify for performance, while the frontend leverages React Native for mobile and React for web, sharing contracts for type safety.

## Stack

- Runtime: Node 20 LTS
- Package manager: npm
- Test framework: Jest (API) / Vitest (web React + Vite SPA) — the owner's decision, 2026-11-20
- Backend: Fastify
- Frontend: React + Vite
- Database: PostgreSQL

## Module structure

```
src/modules/leave/leave.{model,repository,service,controller,routes}.ts
src/modules/balance/balance.{model,repository,service,controller,routes}.ts
src/modules/employee/employee.{model,repository,service,controller,routes}.ts
src/modules/policy/policy.{model,repository,service,controller,routes}.ts
src/modules/notification/notification.{model,repository,service,controller,routes}.ts
src/shared/types/index.ts        — canonical enums, cross-module DTOs, requestedDays helper
src/shared/errors/index.ts       — AppError base + Validation/NotFound/Unauthorized/Forbidden/Conflict subclasses
src/shared/db/connection.ts      — the single pg Pool (DATABASE_URL, SSL in production)
src/shared/db/unit-of-work.ts    — IUnitOfWork + PgUnitOfWork (BEGIN/COMMIT/ROLLBACK)
src/shared/db/index.ts           — public entry point (pool, IUnitOfWork, PgUnitOfWork)
src/shared/date/accrual.ts       — startOfUtcDay, addMonths, periodContaining (pure UTC accrual helpers)
src/shared/date/index.ts         — public entry point re-exporting the three date helpers
```

## Key patterns

- See `AGENTS.md` for stack-specific coding conventions
- See `docs/GOLDEN_PRINCIPLES.md` for the non-negotiable rules every
  cycle is checked against

## Dependency rules

- Modules import from each other ONLY through their declared public
  entry point (`index.ts`, `__init__.py`, package root — whatever the
  stack uses)
- All database access goes through a repository layer — no inline SQL
  / ORM calls in route handlers or business logic
- No circular dependencies between modules

<!-- gestalt:architecture feature=babd3932-368b-46a5-a4dc-6dccaafd84ba START -->

## Module dependency map

_The union of every edge the fourteen feature blocks declared, in one notation: one edge
per line, `- <module> -> <dependency>`. The blocks used **seven** different notations and
four of them were invisible to the gate's own parser, so a map in mixed notation was a map
the check only partly read._

_Module names are the ones `module_of` derives from a path — so a `web/src/` module carries
the `web-` prefix its application root declares. Four names predating that rule were
renamed here (`api-client`, `presentation-pages`, `bootstrap`, `shared-config`): a name the
derivation cannot produce does not fail, it simply never matches._

- audit -> shared-db
- audit -> shared-errors
- audit -> shared-types
- auth -> employee
- auth -> shared-auth
- auth -> shared-errors
- auth -> shared-types
- balance -> employee
- balance -> policy
- balance -> shared-date
- balance -> shared-db
- balance -> shared-errors
- balance -> shared-types
- employee -> shared-auth
- employee -> shared-db
- employee -> shared-errors
- employee -> shared-types
- leave -> audit
- leave -> balance
- leave -> employee
- leave -> notification
- leave -> policy
- leave -> shared-auth
- leave -> shared-date
- leave -> shared-db
- leave -> shared-errors
- leave -> shared-types
- leave -> validation
- leave-type -> shared-db
- leave-type -> shared-errors
- leave-type -> shared-types
- notification -> shared-db
- notification -> shared-errors
- notification -> shared-types
- policy -> leave-type
- policy -> shared-db
- policy -> shared-errors
- policy -> shared-types
- shared-auth -> shared-errors
- shared-auth -> shared-types
- shared-date -> shared-errors
- shared-date -> shared-types
- uptime -> shared-db
- validation -> balance
- validation -> shared-errors
- validation -> shared-types
- web-approvals -> web-employee
- web-approvals -> web-leave
- web-approvals -> web-shared-types
- web-auth -> web-infrastructure-api
- web-auth -> web-shared-types
- web-employee -> web-infrastructure-api
- web-employee -> web-shared-types
- web-infrastructure-api -> web-shared-types
- web-leave -> web-infrastructure-api
- web-leave -> web-shared-types
- web-presentation-components -> web-auth
- web-presentation-guards -> web-auth
- web-presentation-guards -> web-leave
- web-presentation-guards -> web-shared-types
- web-presentation-pages -> web-approvals
- web-presentation-pages -> web-auth
- web-presentation-pages -> web-employee
- web-presentation-pages -> web-leave
- web-presentation-pages -> web-presentation-components
- web-presentation-pages -> web-shared-date
- web-presentation-pages -> web-shared-types

## Domain entities

### Leave management (core) — Domain entities and lifecycle states

- Employee: ACTIVE, TERMINATED, ON_LEAVE.
- LeaveType: ACTIVE, ARCHIVED.
- LeaveRequest: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED.
- LeaveBalance: OPEN, CLOSED.
- LeavePolicy: DRAFT, ACTIVE, SUPERSEDED.
- AuditLog: RECORDED.
- Notification: PENDING, SENT, READ, ARCHIVED.

### Leave cancellation

- **LeaveRequest** — lifecycle: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED. Gains `cancelledBy` and `cancelledAt` (null until cancelled).
- **LeaveBalance** — lifecycle: OPEN, CLOSED. Cancellation mutates `pendingDays` (DRAFT/SUBMITTED) or `usedDays` (APPROVED).
- **AuditLog** — lifecycle: RECORDED. Immutable record; cancellation writes action CANCEL.
- **Notification** — lifecycle: PENDING, SENT, READ, ARCHIVED. Notifies affected employee.

### Authentication and read endpoints — Domain entities and lifecycle states

- **Employee**: id, employeeNumber, firstName, lastName, email, role, managerId, department, hireDate, terminationDate, employmentStatus, passwordHash. Lifecycle: ACTIVE, TERMINATED, ON_LEAVE.
- **AuthToken**: sub, role, expiresIn. Lifecycle: ISSUED, EXPIRED.
- **LeaveRequest**: id, employeeId, leaveTypeCode, startDate, endDate, requestedDays, reason, status, approverId, approvalComment, submittedAt, decidedAt, cancelledBy, cancelledAt. Lifecycle: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED.
- **LeaveBalance**: id, employeeId, leaveTypeCode, periodStart, periodEnd, entitledDays, usedDays, pendingDays, available (computed). Lifecycle: OPEN, CLOSED.
- **LeavePolicy**: id, leaveTypeCode, policyName, annualEntitlementDays, accrualPeriodMonths, carryForwardDays, minNoticeDays, maxRequestDays, requiresManagerApproval, effectiveFrom, effectiveTo, status. Lifecycle: DRAFT, ACTIVE, SUPERSEDED.
- **LeaveType**: code, name, requiresApproval, maxConsecutiveDays, isPaid. Lifecycle: none (static catalog).

### UTC accrual date helpers — Domain

- **AccrualPeriod** (value object): `{ start: Date (UTC midnight, inclusive), end: Date (UTC midnight, exclusive) }`. Half-open accrual window `[start, end)` produced by `periodContaining`. No lifecycle states.
- Binding rules:
  - `startOfUtcDay` derives UTC midnight from UTC calendar fields (`getUTCFullYear/getUTCMonth/getUTCDate`), never local fields.
  - `addMonths` advances calendar month and clamps day-of-month to target month's last day; does not mutate input.
  - `periodContaining` returns half-open `[start, end)`; rejects dates before anchor with `ConflictError('Requested date precedes the accrual anchor')`; steps at most 10,000 periods and throws `ConflictError('Unable to resolve accrual period')`.
  - All three helpers are pure UTC functions independent of host TZ.
  - Exactly one definition of each helper exists in `src/shared/date/accrual.ts`; leave and balance import from shared entry point.

### Web frontend — login and employee leave view — Domain entities (client-side)

- **AuthSession** — token, profile, status. Lifecycle: `LOGGED_OUT` → `LOGGED_IN` → `EXPIRED` → `LOGGED_OUT`. Created on login, cleared on logout or any 401.
- **EmployeeProfile** — read-only signed-in employee; never carries `passwordHash` or `terminationDate`.
- **LeaveBalanceView** — read-only balance; `available = entitledDays - usedDays - pendingDays` (display only, never persisted). Lifecycle: `OPEN`, `CLOSED`.
- **LeaveRequestView** — read-only leave request. Lifecycle displayed only: `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `CANCELLED`. Carries `reversesRequestId: string | null` (the GP-008 reversal linkage): `null` on an original row, the original's id on a CANCELLED reversal row. Read-only projection — no lifecycle transitions and no client-side reversal behaviour.

### Seeded demo account and dev run

- **DemoAccount** (aggregate; no table): manager, employee, leaveTypes, leavePolicies, leaveBalances, leaveRequests, demoCredentials. Lifecycle: none.
- **Employee**: id, employeeNumber, firstName, lastName, email, role, managerId, department, hireDate, terminationDate, employmentStatus, passwordHash. Lifecycle: ACTIVE | TERMINATED | ON_LEAVE.
- **LeaveRequest**: id, employeeId, leaveTypeCode, startDate, endDate, requestedDays, reason, status, approverId, approvalComment, submittedAt, decidedAt, cancelledBy, cancelledAt. Lifecycle: DRAFT | SUBMITTED | APPROVED | REJECTED | CANCELLED.
- **LeaveBalance**: id, employeeId, leaveTypeCode, periodStart, periodEnd, entitledDays, usedDays, pendingDays. Lifecycle: OPEN | CLOSED.
- **LeavePolicy**: id, leaveTypeCode, policyName, annualEntitlementDays, accrualPeriodMonths, carryForwardDays, minNoticeDays, maxRequestDays, requiresManagerApproval, effectiveFrom, effectiveTo, status. Lifecycle: DRAFT | ACTIVE | SUPERSEDED.
- **LeaveType**: code, name, requiresApproval, maxConsecutiveDays, isPaid. Static catalog; no lifecycle.

### Web leave workflow

- **LeaveRequest** — lifecycle: DRAFT → SUBMITTED → APPROVED | REJECTED, plus CANCELLED. Attributes: id, employeeId, leaveTypeCode, startDate (ISO string), endDate (ISO string), requestedDays, reason, status, approverId, approvalComment, submittedAt, decidedAt, cancelledBy, cancelledAt.
- **Employee** — role awareness only; lifecycle: ACTIVE, TERMINATED, ON_LEAVE. Attributes: id, role (EMPLOYEE | MANAGER | ADMIN), managerId.
- **LeaveType** — static catalog; no lifecycle. Attributes: code, name.

### Manager approvals queue (web)

- **ApprovalsQueueItem** — derived read-model projection of a LeaveRequest awaiting decision. Attributes: requestId, employeeId, employeeName (nullable), leaveTypeCode, startDate, endDate, status (always SUBMITTED while in queue). Lifecycle: AWAITING_DECISION -> RESOLVED.
- **LeaveRequest** — existing source-of-truth entity. Attributes: id, employeeId, leaveTypeCode, startDate, endDate, requestedDays, status, approverId, decidedAt. Lifecycle: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED.
- **EmployeeProfile** — signed-in viewer identity/role from GET /employees/me. Attributes: id, role (EMPLOYEE | MANAGER | ADMIN), firstName, lastName. No lifecycle.

### Dashboard leave balances

- **LeaveBalance** (existing canonical): id, employeeId, leaveTypeCode, periodStart, periodEnd, entitledDays, usedDays, pendingDays, available (computed, never persisted). Lifecycle: OPEN, CLOSED.
- **LeaveBalanceView** (existing wire projection): id, employeeId, leaveTypeCode, periodStart, periodEnd, entitledDays, usedDays, pendingDays, available. Immutable read-only view; no lifecycle.
- **DashboardBalanceDisplay** (new presentation state): balances: LeaveBalanceView[], loading: boolean, error: string | null. Lifecycle: LOADING, ERROR, EMPTY, POPULATED (mutually exclusive).

### GP-008 reversal — lifecycle immutability

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

### PORT environment variable

**PortEnvironmentInput** — the immutable snapshot of the process environment's PORT entry, taken once at startup. Attributes: `rawValue: string | undefined` (the exact observed value, passed as `rawPort`), `presence: PortPresence` (ABSENT | PRESENT), `observedAt: Date`.

**ResolvedHttpPort** — the single authoritative port the process will bind to. Attributes: `port: number` (always a positive integer 1..65535 by construction), `source: PortSource` (ENV | DEFAULT), `rawValue: string | undefined` (diagnostics only; never logged verbatim).

### Readiness endpoint (`GET /ready`) — Domain entities

| Entity | Kind | Attributes | Lifecycle states |
|---|---|---|---|
| `ReadinessStatus` | value object | `status: ReadinessState` — the sole field; the wire body is exactly `{status:'ready'}` or `{status:'not-ready'}` | carries `ReadinessState` |
| `ReadinessState` | enum | `READY = 'ready'`, `NOT_READY = 'not-ready'` | `READY`, `NOT_READY` |
| `ReadinessResult` | discriminated result (internal, not a wire type) | `{ ok: true }` \| `{ ok: false; error: unknown }` — the service's return value | none (not a lifecycle entity) |
| `ReadinessProbe` | transient, per-request | `id`, `startedAt`, `completedAt`, `outcome`, `failureReason` | `PENDING`, `SUCCEEDED`, `FAILED` |

**Lifecycle states introduced by this feature (all reflected here):**

- `ReadinessState.READY` — the connectivity probe resolved. Terminal for the probe; maps to HTTP 200 `{status:'ready'}`.
- `ReadinessState.NOT_READY` — the connectivity probe rejected. Terminal for the probe; maps to HTTP 503 `{status:'not-ready'}`.
- `ReadinessProbe.PENDING` — the probe has been created and the connectivity query is in flight; `completedAt` and `outcome` are null.
- `ReadinessProbe.SUCCEEDED` — the query resolved; `outcome = READY`, `completedAt` stamped.
- `ReadinessProbe.FAILED` — the query rejected; `outcome = NOT_READY`, `completedAt` stamped, `failureReason` populated (domain-internal only).

Transitions, all named: `PENDING → SUCCEEDED` (probe resolves), `PENDING → FAILED` (probe rejects). Both are terminal; a probe is never re-entered, retried, cached, or reused. `SUCCEEDED`/`FAILED` are the only states that produce a `ReadinessStatus`.

`ReadinessResult` is not a lifecycle entity: it is the internal, per-call outcome the service hands the route, discriminated on `ok`. It is declared in `uptime.model.ts` alongside the other uptime types, re-exported from the module barrel, and never promoted to `src/shared/types/`. Its `error` field is typed `unknown` (no `any`) and is never serialized — the route passes it to `request.log.error` and replies with `ReadinessStatus`.

### Audit trail for a leave request

**AuditLog** (existing, unchanged shape) — `id`, `actorId`, `action` (AuditAction: CREATE | UPDATE | DELETE | APPROVE | REJECT | CANCEL), `entityType`, `entityId`, `beforeState`, `afterState`, `occurredAt`.
Lifecycle: **RECORDED** — terminal and immutable; reached exactly once at insert, inside the unit of work of the operation it describes. An entry is never updated, deleted, or re-recorded.

**AuditTrail** (new read model / projection — no id, no table, no persistence) — `entityType`, `entityId`, `entries: AuditLog[]`, `entryCount`.
Lifecycle: **EMPTY** — the entity exists and is visible to the caller but no AuditLog row matches `(entityType, entityId)`; a normal, successful outcome (200 with `[]`), never 404, never an error. **POPULATED** — one or more matching entries, ordered oldest first. There is no partial or error state: a failed read throws rather than producing a trail.

**LeaveRequest** (existing, unchanged) — `id`, `employeeId`, `leaveTypeCode`, `startDate`, `endDate`, `requestedDays`, `reason`, `status`, `approverId`, `approvalComment`, `submittedAt`, `decidedAt`, `cancelledBy`, `cancelledAt`, `reversesRequestId`.
Lifecycle: **DRAFT | SUBMITTED | APPROVED | REJECTED | CANCELLED**. No state is added, removed, or changed by this feature. A GP-008 reversal row is born CANCELLED, is terminal and inert, and has no audit trail of its own.

## Lifecycle states

### Policy composition factory

No lifecycle states introduced or changed. Existing states remain: Employee ACTIVE|TERMINATED|ON_LEAVE; LeaveType static; LeavePolicy DRAFT|ACTIVE|SUPERSEDED; LeaveRequest DRAFT|SUBMITTED|APPROVED|REJECTED|CANCELLED; LeaveBalance OPEN|CLOSED; AuditLog RECORDED; Notification PENDING|SENT|READ|ARCHIVED.

### Web leave workflow

- LeaveRequest: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED
- Employee: ACTIVE, TERMINATED, ON_LEAVE
- LeaveType: static (no lifecycle)

### PORT environment variable

**PortEnvironmentInput**
- `ABSENT` — PORT is not present in the environment (`rawValue === undefined`). Resolution must select the default port.
- `PRESENT` — PORT is present as a string, which may be empty, whitespace-only, non-numeric, zero, negative, fractional, or a valid positive integer. Resolution must classify it via the canonical validity predicate.
- No transitions: the snapshot is taken once and never mutated. ABSENT and PRESENT are terminal observations, not a progression.

**ResolvedHttpPort**
- `RESOLVED` — the port has been derived from the snapshot; the only entry state. Resolution is a pure, total function, so there is no failure state and no transition into it.
- `BOUND` — the resolved port was handed to the HTTP listener and accepted. Reached only from `RESOLVED`, exactly once per process.
- `LISTEN_FAILED` — the listener rejected the bind (e.g. port in use). Reached only from `RESOLVED`; terminal for the process (existing behaviour: log the error, exit non-zero).
- No transition from `BOUND` back to `RESOLVED`: the port is resolved once and never re-read.

No existing lifecycle state changes. Employee, LeaveType, LeavePolicy, LeaveRequest, LeaveBalance, AuditLog and Notification lifecycles are untouched.

## Business rules (binding)

### Leave management (core) — Key business rules

- requestedDays = endDate - startDate + 1 (inclusive calendar days) is the single canonical day-count derivation.
- Sufficiency check: entitledDays - usedDays - pendingDays >= requestedDays.
- Reservation lifecycle: submit increments pendingDays; approve decrements pendingDays and increments usedDays; reject/cancel decrements pendingDays only.
- Approval authorization: MANAGER or ADMIN only, no self-approval, approver must be requester's manager or ADMIN.
- Notice: startDate >= today + minNoticeDays (calendar), EMERGENCY exempt.
- Max duration: requestedDays <= maxConsecutiveDays and <= maxRequestDays.
- Every state-changing operation writes an AuditLog.

### Authentication and read endpoints — Binding business rules

- requestedDays = endDate - startDate + 1 (inclusive calendar days, whole-day UTC, no weekend/holiday exclusion) is the single canonical day-count derivation.
- Date-range filtering is inclusive on both edges: startDateFrom <= startDate <= startDateTo and endDateFrom <= endDate <= endDateTo.
- Leave visibility is role-scoped: EMPLOYEE sees only their own requests; MANAGER sees their own plus direct reports (employee.managerId === actor.id), one level only, not transitive; ADMIN sees all. Same rule for list and single-read.
- Manager visibility is status-unrestricted; visibility and decide authority are separate (decide stays SUBMITTED-only).
- Unauthorized single-read returns the same 404 as a nonexistent id (no id probing).
- Login: wrong email vs wrong password indistinguishable; passwordHash never in any response.
- Accrual-period derivation shared (startOfUtcDay/addMonths/periodContaining, pure UTC, anchored on hireDate) — one implementation reused by leave and balance paths.
- Effective policy selection: at most one per leaveTypeCode (ACTIVE, effectiveFrom <= asOf, effectiveTo null or >= asOf; tie-break latest effectiveFrom).
- No balance row for a policy's current period → omit that leave type; no open periods → empty list (200), never an error.
- available = entitledDays - usedDays - pendingDays.
- Actor always resolved from the verified token, never a client-supplied id.

### Web frontend — login and employee leave view — Binding rules

- All API dates render in UTC; never shift by browser local timezone.
- Every authenticated call sends bearer token; any 401 clears token and returns to login.
- Login failure must not reveal whether email exists.
- `available` is display-only, never persisted or mutated.
- Frontend is read-only for leave requests: no create/submit/approve/reject/cancel.

### Seeded demo account and dev run

- Seed idempotency: skip already-seeded rows by composite key; never delete or truncate. Keys: employees by email/employee_number; leave_types by code; leave_policies by stable seed id; leave_balances by (employee_id, leave_type_code, period_start, period_end); leave_requests by (employee_id, leave_type_code, start_date).
- Balance counters: SUBMITTED requestedDays -> pending_days; APPROVED requestedDays -> used_days; DRAFT/REJECTED/CANCELLED reserve nothing.
- Seed is development-only; never runs as part of migrate; wired only into knexfile.js development seeds config.
- requestedDays = endDate - startDate + 1 inclusive whole-day UTC, derived only via shared requestedDays helper.
- All seeded dates use UTC discipline via startOfUtcDay/periodContaining anchored on hireDate.
- Demo passwordHash minted with bcrypt.hashSync(plaintext, 10), the same call AuthService verifies.

### Web leave workflow

- Dates cross the wire as ISO strings, never Date objects; the web client serializes startDate/endDate as ISO strings and parses server responses back to strings for display.
- requestedDays = endDate - startDate + 1 inclusive calendar days, whole-day UTC, no weekend/holiday exclusion; never re-derived client-side.
- A leave request may be created only when endDate is not before startDate, both dates are present, and a leave type is chosen; validated client-side before any network call.
- Action availability is a pure function of (request.status, actor.role, actor.id vs request.employeeId):
  - Owner (request.employeeId === profile.id): submit available when status DRAFT; cancel available when status DRAFT or SUBMITTED.
  - Manager/Admin (profile.role === 'MANAGER' || 'ADMIN'): approve/reject available when status SUBMITTED. The backend enforces the direct-manager rule; the client renders based on role+status and surfaces any 403 as an error.
  - Forbidden actions are never rendered.
- Role awareness comes exclusively from GET /employees/me; the JWT is never decoded in the browser.
- When the backend rejects a create/action, the API's own error message is surfaced verbatim (e.g. insufficient balance), never replaced by a generic failure.
- After a successful action, the leave detail page re-fetches the request and reflects the new status without a manual reload.

### Manager approvals queue (web)

- Queue membership: status === SUBMITTED AND employeeId !== viewer.id AND viewer.role ∈ {MANAGER, ADMIN}. Backend GET /leaves already scopes by role; queue applies SUBMITTED + not-self client-side.
- Visibility role-gated at route boundary: only MANAGER/ADMIN; EMPLOYEE neither sees dashboard link nor can reach /approvals.
- Decision authority reuses getAvailableLeaveActions(status, role, isOwner) — no second copy.
- Decision transitions request out of SUBMITTED, removing it from queue without manual reload.
- Empty queue is explicit normal state, distinct from loading/error.
- Role derived only from EmployeeProfile; JWT never decoded in browser.

### Dashboard leave balances

- `available = entitledDays - usedDays - pendingDays` is the single canonical derivation, computed server-side; the dashboard displays it verbatim and never recomputes locally.
- Full breakdown per leave type: entitledDays, usedDays, pendingDays, available, in that order, with period dates via `formatUtcDate`.
- Dashboard has exactly four mutually exclusive states: LOADING, ERROR, EMPTY, POPULATED. EMPTY is a normal outcome (e.g. new joiner with no accrual period) and must be visibly distinct from LOADING and ERROR.
- Profile and balances fetches are independent. A balances-only failure must resolve to ERROR, never a perpetual loading state. The loading condition must not be `employee === null || balances === null`; use an explicit `loading` boolean set false in both `.then` and `.catch`.
- An empty balances array is a valid non-error result rendered as an explicit empty state.

### GP-008 reversal — lifecycle immutability

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

### PORT environment variable

1. The HTTP port is supplied by exactly one source: the `PORT` environment variable, resolved once at process bootstrap. No literal port number may be passed to the HTTP listener anywhere else, and no other environment variable may override or supplement `PORT`. The name is matched exactly and case-sensitively.
2. Canonical validity predicate — a PORT value is VALID iff it is a non-empty string that, after trimming leading/trailing whitespace, matches `/^[0-9]+$/` AND whose numeric value is `>= 1` and `<= 65535`. Every other value is INVALID. No call site may apply a looser or stricter test.
3. Fallback rule — when PORT is ABSENT, or PRESENT but INVALID, the resolved port is `DEFAULT_PORT` (3000) with source DEFAULT. The fallback is silent: it never throws, never aborts startup, and never emits a warning or error.
4. Single-resolution / single-source-of-truth — the port is resolved exactly once per process, and `ResolvedHttpPort.port` is the ONLY value used for both the listen call and the startup log line. Re-reading `process.env.PORT` after resolution is forbidden.
5. Resolution is a pure, total function of the environment snapshot: `resolvePort(rawPort) -> ResolvedHttpPort`. No I/O, no global state beyond the argument, no failure mode. Callable in a unit test without starting a server, binding a socket, or mutating `process.env`.
6. The resolved port is a positive integer in 1..65535 inclusive. Zero, negative, fractional and out-of-range values are INVALID and fall back to 3000. Port 0 (OS-assigned ephemeral) is deliberately NOT honoured via PORT, because the startup log line must report a concrete port; tests needing an ephemeral port bind port 0 directly on the Fastify instance (the existing `scripts/smoke.js` pattern).
7. The startup log line keeps its existing exact shape and wording — `Server is running on http://localhost:${port}` — with the resolved port interpolated. The host stays the literal `localhost` even though the listener binds `0.0.0.0`; the message is a developer convenience, not a statement of the bind address.
8. The raw PORT string is never logged, echoed in an error message, or returned in any response. Only the resolved numeric port (and at most the `PortSource` classification) may appear in logs (GP-004).
9. Port resolution is a bootstrap concern only: it writes no audit record (GP-002 does not apply), requires no authentication or role check (GP-005 does not apply), and opens no transaction. It must not be routed through the repository layer (GP-001 does not apply — there is no persisted entity).

### Readiness endpoint (`GET /ready`) — Business rules (binding)

1. The readiness predicate is exactly one thing: a trivial connectivity query against the configured PostgreSQL pool succeeds. Nothing else is checked — not disk, not memory, not downstream services, not migrations, not schema version. DECIDED, not open.
2. The probe is binary and total: resolves → `READY`; rejects → `NOT_READY`. No third outcome, no partial readiness, no degraded state. Any rejection (connection refused, auth failure, timeout, pool exhaustion) maps to `NOT_READY` without discrimination.
3. The probe is stateless and per-request: it opens no new pool, adds no dependency, caches no result, and holds no state between requests. It uses the existing shared pool from `src/shared/db/connection.ts`.
3a. The probe is **bounded in time**: the connectivity query carries an explicit 2000ms timeout owned by the readiness check itself, declared as the module-level named constant `READINESS_QUERY_TIMEOUT_MS` in `uptime.repository.ts`. It does not rely on the pool's `connectionTimeoutMillis` or the caller's deadline — a hung pool must not hang the probe. On timeout the rejection is identical to a rejected query and maps to `NOT_READY`.
3b. A successful **round trip** is required: acquiring a client from the pool is not sufficient, the query must return. A pool that hands out a client to an unreachable database is exactly the state readiness exists to detect.
4. The response body is fixed and carries no diagnostic detail: `READY` → HTTP 200 with exactly `{status:'ready'}`; `NOT_READY` → HTTP 503 with exactly `{status:'not-ready'}`. No other fields, no error message, no code, no stack, no raw error. The failure reason never crosses the HTTP boundary.
5. On a failed probe the error is logged through the existing Fastify request logger (`request.log.error`), exactly as the existing `/uptime` route does. No new logging mechanism. The raw error is logged, never returned in the body.
6. Readiness is a pure observation and is NOT a state-changing operation: it writes no audit record (GP-002 does not apply), mutates no entity, and opens no transaction. It must not be routed through `IUnitOfWork`.
7. The readiness endpoint is unauthenticated: it is a probe consumed by orchestrators that hold no bearer token. It is added to the `PUBLIC_PATHS` set in `src/shared/auth/index.ts` alongside `/uptime` and `/health`. GP-005 (RBAC) does not apply — there is no actor and no protected resource.
8. Liveness and readiness are distinct and must not be conflated: `/uptime` reports process uptime and never touches the database; `/ready` reports database connectivity and never reports uptime. The existing `/uptime` endpoint is not migrated, changed, or made to depend on the pool.
9. The probe's connectivity query is trivial and read-only: it must not read or write any domain table, must not depend on any table existing, and must not be a domain repository call. It is a bare pool-level round trip (`SELECT 1`).

### Audit trail for a leave request — Binding rules

1. A trail is identified by the PAIR `(entityType, entityId)`, never by `entityId` alone. `entityType` is the exact, case-sensitive literal `'leave_request'` for a leave request.
2. A trail is ordered by `occurredAt` ASCENDING (oldest first) — the canonical order for every trail read, everywhere. No consumer may reverse it for display. Ties are broken on `id` ASCENDING so repeated reads are deterministic.
3. Who may see a leave request's history is EXACTLY who may see the leave request itself, established by calling the existing `getById(actor, requestId)` first and letting it throw. It must not be re-expressed anywhere, and the audit module must stay role-blind.
4. A caller who may not see the request receives the SAME 404 (`NotFoundError`, code `NOT_FOUND`, byte-identical body) as a caller asking for a request that does not exist. Never 403, never 401, never an empty trail.
5. An empty trail is a SUCCESS, not an error: 200 with an empty array, never 404.
6. A GP-008 reversal row has NO audit entries of its own — its CANCEL entry carries the ORIGINAL request id — so `GET /leaves/:reversalId/history` legitimately returns an empty trail. Provenance is reached via `reversesRequestId`, not inferred from the trail.
7. The trail is append-only and read-only. Reading a trail writes nothing; no entry is ever updated or deleted.
8. Every state-changing leave operation writes exactly one AuditLog entry against the row it changed, except the GP-008 reversal (which targets the original).
9. A trail read returns ALL matching entries — no limit, offset, date filter, or action filter.
10. Each entry is projected as exactly `{ id, actorId, action, entityType, entityId, beforeState, afterState, occurredAt }` — the entity, not a summary. No field added, renamed, or dropped.

## Conceptual table specifications

### Leave management (core) — Conceptual tables

employees, leave_types, leave_policies, leave_requests, leave_balances, notifications, audit_logs. No SQL DDL; code agent generates migrations.

### Leave cancellation — Conceptual tables (no DDL)

- **leave_requests**: id, employee_id, leave_type_code, start_date, end_date, requested_days, reason, status, approver_id, approval_comment, submitted_at, decided_at, cancelled_by, cancelled_at. PK id. FKs employee_id -> employees.id, leave_type_code -> leave_types.code, approver_id -> employees.id, cancelled_by -> employees.id. Indexes: employee_id, status, (leave_type_code, start_date).
- **leave_balances**: id, employee_id, leave_type_code, period_start, period_end, entitled_days, used_days, pending_days. PK id. FKs employee_id -> employees.id, leave_type_code -> leave_types.code. Unique index (employee_id, leave_type_code, period_start, period_end); index employee_id.
- **audit_logs**: id, actor_id, action, entity_type, entity_id, before_state, after_state, occurred_at. PK id. FK actor_id -> employees.id. Indexes (entity_type, entity_id), actor_id.
- **notifications**: id, recipient_id, type, title, message, related_entity_type, related_entity_id, status, created_at, read_at. PK id. FK recipient_id -> employees.id. Indexes recipient_id, status.

### Authentication and read endpoints — Conceptual tables

- **employees**: fields id, employee_number, first_name, last_name, email, password_hash, role, manager_id, department, hire_date, termination_date, employment_status. PK id. FK manager_id -> employees.id. Indexes: email unique, employee_number unique, manager_id.
- **leave_requests**: fields id, employee_id, leave_type_code, start_date, end_date, requested_days, reason, status, approver_id, approval_comment, submitted_at, decided_at, cancelled_by, cancelled_at. PK id. FKs employee_id -> employees.id, leave_type_code -> leave_types.code, approver_id -> employees.id, cancelled_by -> employees.id. Indexes: employee_id, status, (leave_type_code, start_date).
- **leave_balances**: fields id, employee_id, leave_type_code, period_start, period_end, entitled_days, used_days, pending_days. PK id. FKs employee_id -> employees.id, leave_type_code -> leave_types.code. Indexes: (employee_id, leave_type_code, period_start, period_end) unique, employee_id.
- **leave_policies**: fields id, leave_type_code, policy_name, annual_entitlement_days, accrual_period_months, carry_forward_days, min_notice_days, max_request_days, requires_manager_approval, effective_from, effective_to, status. PK id. FK leave_type_code -> leave_types.code. Index: leave_type_code.
- **leave_types**: fields code, name, requires_approval, max_consecutive_days, is_paid. PK code. Index: code natural key.

Migration note: add nullable `password_hash` to `employees` using `t.text(...)` per initial-schema convention; date columns are UTC-parsed by `src/shared/db/connection.ts`.

### UTC accrual date helpers — Data

No schema changes. Existing tables (`leave_requests`, `leave_balances`, etc.) and repositories (`PgLeaveRequestRepository`, `PgLeaveBalanceRepository`, etc.) untouched. No new repository interfaces or implementations. No transaction contract.

### Web frontend — login and employee leave view — Data

No new SQL schemas, tables, or repositories. Existing backend tables (`employees`, `leave_requests`, `leave_balances`, `leave_types`, `leave_policies`) are consumed via HTTP and remain unchanged.

### Seeded demo account and dev run — Conceptual Tables

- **employees**: fields id, employee_number, first_name, last_name, email, password_hash, role, manager_id, department, hire_date, termination_date, employment_status. PK id. FK manager_id -> employees.id. Indexes: email unique (login lookup, seed idempotency), employee_number unique (natural key, seed idempotency), manager_id (direct-report lookups).
- **leave_types**: fields code, name, requires_approval, max_consecutive_days, is_paid. PK code. Index: code (natural key, seed idempotency, policy FK lookups).
- **leave_policies**: fields id, leave_type_code, policy_name, annual_entitlement_days, accrual_period_months, carry_forward_days, min_notice_days, max_request_days, requires_manager_approval, effective_from, effective_to, status. PK id. FK leave_type_code -> leave_types.code. Indexes: leave_type_code (policy lookup by type), id (seed idempotency by stable seed id).
- **leave_balances**: fields id, employee_id, leave_type_code, period_start, period_end, entitled_days, used_days, pending_days. PK id. FKs employee_id -> employees.id, leave_type_code -> leave_types.code. Unique index (employee_id, leave_type_code, period_start, period_end) for findByKey and seed idempotency. Index employee_id for balance reads.
- **leave_requests**: fields id, employee_id, leave_type_code, start_date, end_date, requested_days, reason, status, approver_id, approval_comment, submitted_at, decided_at, cancelled_by, cancelled_at. PK id. FKs employee_id -> employees.id, leave_type_code -> leave_types.code, approver_id -> employees.id, cancelled_by -> employees.id. Indexes: employee_id (owner scoping), status (filtering), (leave_type_code, start_date) (date-range/type queries), (employee_id, leave_type_code, start_date) (seed idempotency composite key).

### Web leave workflow

None. No new persistence in `web/`; existing backend tables (`leave_requests`, `leave_balances`, `audit_logs`, `notifications`, `employees`, `leave_types`, `leave_policies`) are unchanged and out of scope.

### Manager approvals queue (web) — Conceptual tables (pre-existing, unchanged)

- **leave_requests**: id, employee_id, leave_type_code, start_date, end_date, requested_days, reason, status, approver_id, approval_comment, submitted_at, decided_at, cancelled_by, cancelled_at. PK id. FKs employee_id -> employees.id, leave_type_code -> leave_types.code, approver_id -> employees.id, cancelled_by -> employees.id. Indexes: status (queue filter), employee_id (direct reports), (leave_type_code, start_date) (list/date-range).
- **employees**: id, employee_number, first_name, last_name, email, password_hash, role, manager_id, department, hire_date, termination_date, employment_status. PK id. FK manager_id -> employees.id. Indexes: manager_id (direct reports), email (unique login), employee_number (unique lookup).

No new tables, columns, or repositories.

### Dashboard leave balances — Persistence

No new tables, repositories, or repository implementations. Existing backend tables (employees, leave_types, leave_policies, leave_balances, leave_requests, audit_logs, notifications) are reused unchanged. No SQL DDL.

### GP-008 reversal — lifecycle immutability — Conceptual table specifications (no DDL)

**`leave_requests`** — fields: `id`, `employee_id`, `leave_type_code`, `start_date`, `end_date`, `requested_days`, `reason`, `status`, `approver_id`, `approval_comment`, `submitted_at`, `decided_at`, `cancelled_by`, `cancelled_at`, `reverses_request_id`. PK `id`. FKs: `employee_id -> employees.id`, `leave_type_code -> leave_types.code`, `approver_id -> employees.id`, `cancelled_by -> employees.id`, `reverses_request_id -> leave_requests.id`. Indexes: `id` (PK); `reverses_request_id` UNIQUE nullable — the DB backstop for exactly-once release and the `findByReversesRequestId` lookup; `employee_id, status` composite — role-scoped list queries and owner/status guards; `leave_type_code, start_date` — type filter, inclusive date-range filter, `ORDER BY start_date DESC`; `status` — status-filtered lists and the existing-reversal scan; `employee_id` — FK lookups and per-employee history.

**`leave_balances`** — fields: `id`, `employee_id`, `leave_type_code`, `period_start`, `period_end`, `entitled_days`, `used_days`, `pending_days`. PK `id`. FKs: `employee_id -> employees.id`, `leave_type_code -> leave_types.code`. Indexes: `id` (PK, release update target); `employee_id, leave_type_code, period_start, period_end` UNIQUE — `findByKey` resolves exactly one row and is the `forUpdate` lock target; `employee_id` — per-employee balance reads.

**`audit_logs`** — fields: `id`, `actor_id`, `action`, `entity_type`, `entity_id`, `before_state`, `after_state`, `occurred_at`. PK `id`. FK: `actor_id -> employees.id`. Indexes: `id` (PK); `entity_type, entity_id` — the trail for one leave request, with the reversal's CANCEL entry written against the ORIGINAL request id; `actor_id` — actor-history queries.

**`notifications`** — fields: `id`, `recipient_id`, `type`, `title`, `message`, `related_entity_type`, `related_entity_id`, `status`, `created_at`, `read_at`. PK `id`. FK: `recipient_id -> employees.id`. Indexes: `id` (PK); `recipient_id, status` — inbox read pattern; `related_entity_type, related_entity_id` — the cancellation notification points at the ORIGINAL request id.

### PORT environment variable

**None.** This feature creates, reads, updates or deletes no domain state. No new table, column, index or migration is required. Inventing a `server_config` / `app_settings` row holding the port would contradict the feature's contract (the port comes from the environment, not the database) and would add a DB dependency to process startup, which currently has none. The existing conceptual tables (employees, leave_types, leave_policies, leave_requests, leave_balances, notifications, audit_logs) are unchanged and remain specified once, elsewhere in this document.

### Readiness endpoint (`GET /ready`) — Persistence

**No tables.** This feature persists no state. `sqlSchemas` is intentionally empty and the code agent has no migration to generate. No `readiness_checks` / probe-history / audit table is introduced — GP-002 binds state-changing operations, and a probe changes no state (an audit row per probe would also make readiness depend on a writable DB and turn a health path into a write path). No existing table is altered or redefined here; `employees`, `leave_requests`, `leave_balances`, `leave_policies`, `leave_types`, `audit_logs`, `notifications` remain defined once, in the earlier features' specs.

### Audit trail for a leave request

**`audit_logs`** — the only table this feature reads.
Fields: `id`, `actor_id`, `action`, `entity_type`, `entity_id`, `before_state`, `after_state`, `occurred_at`. PK `id`. FK `actor_id -> employees.id`.
Indexes: `id` (PK; serves the existing `findById` lookup by audit id — the only read path today, and the reason the trail is unreachable). `(entity_type, entity_id)` — the composite index that makes the new `findByEntity` query a bounded index scan instead of a full table scan; this is the access path the feature exists to open, and it is also what the GP-008 reversal relies on (the CANCEL entry for a cancelled-after-approval request is written against the ORIGINAL request id). `actor_id` — actor-history queries; not used by this feature. `(entity_type, entity_id, occurred_at)` is NOT present today; extending the index is an open question (see below). `before_state`/`after_state` are TEXT holding JSON strings (deliberate: the repository stringifies on write and parses on read, so a real json/jsonb column would break `mapRow`); the new query MUST reuse the existing `mapRow`/`parseState` helpers so history entries are structurally identical to what `findById` already returns.

**`leave_requests`** — UNCHANGED and referenced by name only; defined once in the earlier leave/cancellation/GP-008 specs. This feature adds no column and no index.
Fields: `id`, `employee_id`, `leave_type_code`, `start_date`, `end_date`, `requested_days`, `reason`, `status`, `approver_id`, `approval_comment`, `submitted_at`, `decided_at`, `cancelled_by`, `cancelled_at`, `reverses_request_id`. PK `id`. FKs: `employee_id -> employees.id`, `leave_type_code -> leave_types.code`, `approver_id -> employees.id`, `cancelled_by -> employees.id`, `reverses_request_id -> leave_requests.id`.
Indexes: `id` (PK; the lookup the history endpoint performs FIRST, via the existing `LeaveService.getById(actor, requestId)`, before any audit row is read — visibility is established here, not in the audit module). `employee_id` — the column the leave module's visibility rule reads; the audit module never reads it. `(employee_id, status)` — role-scoped list queries; not used by the history endpoint. `reverses_request_id` (UNIQUE, nullable) — the GP-008 linkage; a cancelled-after-approval request is TWO rows and the CANCEL audit entry is keyed to the ORIGINAL id, so the endpoint returns the trail of the row whose id was requested and does not merge the two.

## Repository interfaces and implementations

### Leave cancellation — Repositories

- ILeaveRepository -> PgLeaveRequestRepository: create, findById, update, findByQuery
- IBalanceRepository -> PgLeaveBalanceRepository: create, findById, findByKey, update
- IAuditRepository -> PgAuditLogRepository: create, findById
- INotificationRepository -> PgNotificationRepository: create, findById, updateStatus

### Authentication and read endpoints — Repositories

- **IEmployeeRepository / PgEmployeeRepository**: create, findById, findByEmployeeNumber, findByEmail, findByManagerId.
- **ILeaveRepository / PgLeaveRequestRepository**: create, findById, update, findByQuery.
- **IPolicyRepository / PgLeavePolicyRepository**: create, findById, findByLeaveTypeCode, findAll.
- **IBalanceRepository / PgLeaveBalanceRepository**: create, findById, findByKey, update.
- **ILeaveTypeRepository / PgLeaveTypeRepository** (existing, referenced by policy): findById/findByCode.

### Policy composition factory — Repository interfaces and concrete implementations

- `IPolicyRepository` -> `PgLeavePolicyRepository` (PostgreSQL via shared/db Pool; optional trailing PoolClient for caller-owned transactions)
- `ILeaveTypeRepository` -> `PgLeaveTypeRepository` (PostgreSQL via shared/db Pool; optional trailing PoolClient for caller-owned transactions)
- Existing `IBalanceRepository` -> `PgLeaveBalanceRepository` and `ILeaveRepository` -> `PgLeaveRequestRepository` are unchanged.

### Seeded demo account and dev run — Repository Interfaces

No new repository interfaces are introduced. Existing concrete implementations remain: PgEmployeeRepository, PgLeaveTypeRepository, PgLeavePolicyRepository, PgLeaveBalanceRepository, PgLeaveRequestRepository (PostgreSQL via shared pg Pool). The seed writes directly through the knex instance (standard knex seed mechanism), not through application repositories.

### Web leave workflow — Repository interfaces and concrete implementations

None in `web/`. Transport is `IApiClient`/`ApiClient`; no database repositories are introduced.

### Manager approvals queue (web) — Repository interfaces / data access

No new repository interfaces. Existing web data-access boundary is IApiClient/ApiClient (HTTP fetch), with LeaveService/EmployeeService delegating to it. ApprovalsService reuses getLeaves(), approveLeave(), rejectLeave(), and getAvailableLeaveActions(); no new transport methods.

### GP-008 reversal — lifecycle immutability — Repository interfaces and concrete implementations

- **`ILeaveRepository` / `PgLeaveRequestRepository`** (PostgreSQL via the shared pg Pool, `src/shared/db/connection.ts`; every method takes an optional trailing `PoolClient` and falls back to the shared pool; the repository never opens BEGIN/COMMIT/ROLLBACK):
  - `create(input, client?)` — inserts all 15 columns including `reverses_request_id`; used for the NEW CANCELLED reversal row.
  - `findById(id, client?)` — returns null when absent.
  - `findByReversesRequestId(reversesRequestId, client?)` — resolves the reversal row for an original id so the service can detect an already-reversed APPROVED request before releasing the balance a second time.
  - `update(id, changes, client?)` — dynamic SET from FIELD_COLUMNS; used ONLY for the in-place DRAFT/SUBMITTED cancellation. MUST NOT be called with the id of an APPROVED row (GP-008).
  - `findByQuery(params, client?)` — status/leaveTypeCode/date-range/employeeIds filters plus limit/offset, `ORDER BY start_date DESC`; returns both the original APPROVED row and its CANCELLED reversal row, each carrying `reverses_request_id`.
- **`IBalanceRepository` / `PgLeaveBalanceRepository`**: `findByKey(employeeId, leaveTypeCode, periodStart, periodEnd, client?, forUpdate?)` (release path passes `forUpdate=true`), `update(id, changes, client?)` (the single write that releases `requestedDays` back to `usedDays` or decrements `pendingDays`), `findById`, `create`.
- **`IAuditRepository` / `PgAuditLogRepository`**: `create(input, client?)` (generates id via `randomUUID()`, stamps `occurredAt`, JSON-stringifies before/after state; the reversal writes action CANCEL with `entityId` = the ORIGINAL request id), `findById`.
- **`INotificationRepository` / `PgNotificationRepository`**: `create(input, client?)` (`relatedEntityId` = the ORIGINAL request id), `findById`, `updateStatus`.

### PORT environment variable

**None.** No repository interface and therefore no concrete implementation. GP-001 is not engaged because there is no DB access. The existing `IEmployeeRepository`/`PgEmployeeRepository`, `ILeaveRepository`/`PgLeaveRequestRepository`, `IBalanceRepository`/`PgLeaveBalanceRepository`, `IPolicyRepository`/`PgLeavePolicyRepository`, `ILeaveTypeRepository`/`PgLeaveTypeRepository`, `IAuditRepository`/`PgAuditLogRepository` and `INotificationRepository`/`PgNotificationRepository` (all PostgreSQL via the shared `pg` Pool in `src/shared/db/connection.ts`) are untouched.

### Readiness endpoint (`GET /ready`) — Repository

| Interface | Concrete | Method | Backing |
|---|---|---|---|
| `IReadinessRepository` | `PgReadinessRepository` | `check(): Promise<void>` — issues the trivial connectivity query (`SELECT 1`) against the shared pool; resolves when the round trip succeeds, rejects with the underlying pg error otherwise. No retry, no error swallowing, no logging (the route owns `request.log.error`). | PostgreSQL via the existing shared `pg` Pool exported from `src/shared/db/connection.ts` (constructor-injected `dbPool: Pool = defaultPool`), exactly as `PgLeaveRequestRepository` / `PgLeaveBalanceRepository` do. No new pool, no new dependency, no ORM. |

Declared in `src/modules/uptime/uptime.repository.interface.ts`, implemented in `src/modules/uptime/uptime.repository.ts`, both re-exported from `src/modules/uptime/index.ts`.

**Deliberate divergence (flagged, not silently taken):** `check()` takes NO optional trailing `PoolClient`, unlike every other repository in this codebase. The optional-client convention exists so a write can join a caller's transaction; a connectivity probe that joined a caller's transaction would test that transaction rather than the pool, and could report ready while the pool is exhausted. The probe must always acquire from the shared pool.

### Audit trail for a leave request — Repository interfaces and concrete implementations

**`IAuditRepository` -> `PgAuditLogRepository`** (PostgreSQL via the shared `pg` Pool from `src/shared/db/connection.ts`, constructor-injected `dbPool: Pool = defaultPool`). Declared in `src/modules/audit/audit.repository.interface.ts`, implemented in `src/modules/audit/audit.repository.ts`, both re-exported from `src/modules/audit/index.ts`.
- `create(input, client?)` — EXISTING, unchanged. Generates `id` via `randomUUID()`, stamps `occurredAt`, JSON-stringifies `beforeState`/`afterState`.
- `findById(id, client?)` — EXISTING, unchanged. Returns `null` when absent.
- `findByEntity(entityType, entityId)` — **NEW, DELIVERED (Phase 1)**. Takes NO optional trailing `PoolClient`: this read path opens no transaction and joins none, so it queries through the existing private `db(client?)` accessor with no client argument. `SELECT` the existing COLUMNS list `FROM audit_logs WHERE entity_type = $1 AND entity_id = $2 ORDER BY occurred_at ASC, id ASC`. Returns an array, possibly empty — never `null`, never throws on no rows. Ordering is owned by the repository's SQL, not by the caller; no caller may re-sort. Reuses `mapRow`/`parseState`. No LIMIT/OFFSET, no date or action filter.

**`IAuditService` -> `AuditService`** (backed by `IAuditRepository`/`PgAuditLogRepository`; constructed as `new AuditService(new PgAuditLogRepository())`). Declared in `src/modules/audit/audit.service.interface.ts`, implemented in `src/modules/audit/audit.service.ts`, both re-exported from `src/modules/audit/index.ts`.
- `record(input, client?)` — EXISTING, unchanged. Validates non-empty `actorId`/`entityType`/`entityId` and AuditAction membership (ValidationError), then delegates with the optional client forwarded so the insert joins the caller's transaction.
- `getById(id)` — EXISTING, unchanged. `NotFoundError` (404) on unknown id.
- `getByEntity(entityType, entityId)` — **NEW, DELIVERED (Phase 1)**. Validates that `entityType` and `entityId` are non-empty strings (ValidationError) and delegates to `repository.findByEntity`. Returns the array unchanged, including an EMPTY array — an entity with no audit rows is a valid 200-with-`[]` outcome, never a `NotFoundError`. Takes NO optional `PoolClient`: this is a read path, it opens no transaction and joins none. It performs NO authorization and NO role check — `EmployeeRole` is an owned decision of the leave and web-leave modules, and the audit module must not branch on it.

**`ILeaveRepository` -> `PgLeaveRequestRepository`** (PostgreSQL via the shared `pg` Pool; declared inline in `src/modules/leave/leave.repository.ts`, re-exported from `src/modules/leave/index.ts`). UNCHANGED — no method added, no column added. Listed only to make the transitive read dependency explicit: `LeaveService.getHistory` calls the EXISTING `LeaveService.getById(actor, requestId)`, which calls `findById` and then applies the leave module's visibility rule. The audit module never calls this repository, and the history endpoint never queries `leave_requests` directly.

**`ILeaveService` -> `LeaveService`** (`src/modules/leave/leave.service.ts`). Gains ONE method (NOT yet built — Phase 2):
- `getHistory(actor, requestId)` — **NEW**. Calls the EXISTING `this.getById(actor, requestId)` FIRST and lets it throw (so an invisible request yields the SAME 404 as a nonexistent one, never a 403), then calls `this.auditService.getByEntity(LEAVE_REQUEST_ENTITY_TYPE, requestId)` and returns the entries oldest-first. Read-only: no `uow.withTransaction`, no client forwarding, no writes. It does NOT re-derive visibility and does NOT branch on `EmployeeRole`.

## Module boundaries

### Leave management (core) — Modules

shared-types, shared-db, shared-errors, employee, leave-type, policy, audit, notification, balance, validation, leave.

### Leave cancellation — Modules

- **leave** (`src/modules/leave/`) owns ILeaveService.cancel + LeaveService.cancel orchestration, cancellation authorization, balance release, POST /leaves/:id/cancel, CANCEL audit + notification.
- **shared-types** (`src/shared/types/`) owns AuditAction.CANCEL enum value.

### Authentication and read endpoints — Modules and boundaries

- **shared-date** (`src/shared/date/`): startOfUtcDay, addMonths, periodContaining, index.ts.
- **shared-types** (`src/shared/types/`): EmployeeProfile, LeaveRequestQueryParams.employeeIds, canonical enums, requestedDays.
- **shared-auth** (`src/shared/auth/`): registerAuth, signToken, verifyToken, public path set.
- **shared-errors** (`src/shared/errors/`): AppError, ValidationError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError.
- **shared-db** (`src/shared/db/`): connection.ts, pg Pool, IUnitOfWork.
- **validation** (`src/shared/validation/`): validation helpers.
- **audit** (`src/modules/audit/`): audit logging.
- **notification** (`src/modules/notification/`): notification dispatch.
- **leave-type** (`src/modules/leave-type/`): LeaveType, ILeaveTypeRepository, PgLeaveTypeRepository, LeaveTypeService.
- **auth** (`src/modules/auth/`): IAuthService, AuthService, authRoutes (POST /auth/login), login flow (bcrypt compare + signToken).
- **employee** (`src/modules/employee/`): Employee (incl passwordHash), IEmployeeRepository (+findByManagerId), PgEmployeeRepository, IEmployeeService (+getEmployeeByEmail, getEmployeesByManagerId, getEmployeeProfileById), EmployeeService, employeeRoutes (GET /employees/me), toEmployeeProfile mapping.
- **policy** (`src/modules/policy/`): LeavePolicy, IPolicyRepository, PgLeavePolicyRepository, IPolicyService (+getAllPolicies), PolicyService.
- **balance** (`src/modules/balance/`): LeaveBalance, IBalanceRepository, PgLeaveBalanceRepository, IBalanceService (+getCurrentBalances), BalanceService, balanceRoutes (GET /balances/me).
- **leave** (`src/modules/leave/`): LeaveRequest, ILeaveRepository, PgLeaveRequestRepository, ILeaveService (+list, getById), LeaveService, leaveRoutes (+GET /leaves, GET /leaves/:id).

### Authentication and read endpoints — The web build (`web/src/`)

This repository holds TWO builds. The service above lives under `src/`; the React app lives
under `web/src/` with its own `package.json` and its own module boundaries. They are declared
as separate application roots in `HARNESS.json` (`qualityGate.applicationRoots`), and the web
root carries the `web-` prefix — without it the two builds' `leave` modules would collide in
this one flat map, which is how a frontend came to be checked against the backend's
allow-list and had every import reported as a violation (run `ecef04ad`).

Module names are DERIVED from the path, not chosen: `<prefix><name>` under the `modules`
container, `<prefix><container>-<name>` under any other. A name that does not derive this way
is not merely odd — the dependency check resolves the file, finds no entry, and stays silent.
This map previously carried `api-client` and `presentation-pages`, which matched nothing, so
the entire frontend was checked by nothing at all.

The direction is: presentation -> modules -> infrastructure -> shared. `web-approvals`
deliberately does NOT reach `web-infrastructure-api` directly; it goes through the
`web-leave` and `web-employee` services, and that is the layering this map exists to hold.

- web-infrastructure-api -> web-shared-types
- web-auth -> web-infrastructure-api, web-shared-types
- web-employee -> web-infrastructure-api, web-shared-types
- web-leave -> web-infrastructure-api, web-shared-types
- web-approvals -> web-employee, web-leave, web-shared-types
- web-presentation-components -> web-auth
`web-leave` is here for ONE import: `canApproveLeave`. A route guard asking the module
that owns the authorization rule is the point — the guard used to carry its own inverted
copy (`role === EMPLOYEE -> deny`), which fails OPEN the day a fourth role exists.
- web-presentation-guards -> web-auth, web-leave, web-shared-types
- web-presentation-pages -> web-approvals, web-auth, web-employee, web-leave, web-presentation-components, web-shared-date, web-shared-types

### UTC accrual date helpers — Modules

- `shared-date` (`src/shared/date/`) owns `startOfUtcDay`, `addMonths`, `periodContaining`, `index.ts`.
- `leave` (`src/modules/leave/`) owns `LeaveService`; deletes private copies, imports all three from `../../shared/date`.
- `balance` (`src/modules/balance/`) owns `BalanceService`; deletes private `addMonths`, adds to existing shared import.

### Policy composition factory

- `policy` owns `createPolicyService()` and exports it from `src/modules/policy/index.ts`. The factory constructs `PolicyService` with `PgLeavePolicyRepository` and `LeaveTypeService(PgLeaveTypeRepository)`.
- `balance` and `leave` no longer import from `../leave-type`; they import `createPolicyService` from `../policy`.
- `leave-type` remains unchanged and is depended on only by `policy`.

### Web frontend — login and employee leave view

- `shared-types` — `web/src/shared/types/` — `EmployeeProfile`, `LeaveBalanceView`, `LeaveRequestView`, `LoginResponse`, enums (`EmployeeRole`, `LeaveTypeCode`, `LeaveStatus`, `EmploymentStatus`, `AuthSessionStatus`).
- `shared-date` — `web/src/shared/date/` — `formatUtcDate`, `parseUtcDate`.
- `api-client` — `web/src/infrastructure/api/` — `IApiClient`/`ApiClient`, `ITokenStorage`/`TokenStorage`, `ApiError`.
- `auth` — `web/src/modules/auth/` — `IAuthService`/`AuthService`, `AuthProvider`/`useAuth`, `AuthSession`.
- `employee` — `web/src/modules/employee/` — `IEmployeeService`/`EmployeeService`.
- `leave` — `web/src/modules/leave/` — `ILeaveService`/`LeaveService`, `IBalanceService`/`BalanceService`.
- `presentation` — `web/src/presentation/` — App router, `LoginPage`, `DashboardPage`, `LeaveListPage`, `LeaveDetailPage`, shared UI components.

### Seeded demo account and dev run — Module Boundaries and Dependencies

- **seed** (`seeds/`): owns demo dataset, idempotency, balance-counter consistency, knex entry. Depends on shared-types and shared-date.
- **dev-runner** (`scripts/dev.js`): spawns API and web dev server, forwards output/exit codes, signal handling.
- **shared-types** (`src/shared/types`): existing enums and requestedDays helper.
- **shared-date** (`src/shared/date`): existing startOfUtcDay and periodContaining helpers.

### Web leave workflow

- `shared-types` — `web/src/shared/types/` — CreateLeaveRequestInput DTO, LeaveTypeCode, LeaveStatus, EmployeeRole, LeaveRequestView, EmployeeProfile.
- `api-client` — `web/src/infrastructure/api/` — IApiClient (extended with createLeave/submitLeave/approveLeave/rejectLeave/cancelLeave), ApiClient, ApiError, ITokenStorage/TokenStorage.
- `leave` — `web/src/modules/leave/` — ILeaveService (extended with create/submit/approve/reject/cancel), LeaveService, getAvailableLeaveActions, validateLeaveRequestInput, IBalanceService/BalanceService.
- `employee` — `web/src/modules/employee/` — IEmployeeService.getMe(), EmployeeService.
- `presentation-pages` — `web/src/presentation/pages/` — RequestLeavePage, LeaveDetailPage, LeaveListPage, DashboardPage.
- `presentation-guards` — `web/src/presentation/guards/` — RequireAuth.

### Manager approvals queue (web)

- `web/src/modules/approvals/` — IApprovalsService, ApprovalsService, index.ts. Methods: listPending(profile), approve(id), reject(id).
- `web/src/presentation/guards/` — RequireApprover (MANAGER|ADMIN only, else redirect).
- `web/src/presentation/pages/` — ApprovalsPage (list, approve/reject, empty state, drill-in link), DashboardPage (role-gated approvals link).
- `web/src/presentation/App.tsx` — /approvals route wrapped in RequireAuth + RequireApprover.

Dependencies flow inward: presentation -> modules -> infrastructure. Approvals depends on leave, employee, shared-types. No circular edges.

### Dashboard leave balances

- `web-presentation-pages` (`web/src/presentation/pages/`) owns `DashboardPage` and its test. It depends on `web-shared-types`, `web-shared-date`, `web-leave`, `web-employee`, `web-auth`, `web-presentation-components`. No new modules or services.

### GP-008 reversal — lifecycle immutability

- **Presentation** — `src/modules/*/*.routes.ts` (Fastify route handlers; no controller layer). Routes do boundary parsing, `resolveActor`, and `sendError`; no business logic, no SQL.
- **Application** — `src/modules/*/*.service.ts` (`ILeaveService`, `IBalanceService`, `IAuditService`, `INotificationService`, `IEmployeeService`, `IPolicyService`, `IValidationService`). Services own the transaction boundary via `IUnitOfWork.withTransaction` and orchestrate repositories. `leave` is the sole orchestrator.
- **Domain** — `src/modules/*/*.model.ts` (entities + `Create*Input` types) and `src/shared/types/index.ts` (canonical enums, cross-module DTOs, `requestedDays`).
- **Infrastructure** — `src/modules/*/*.repository.ts` (`Pg*Repository`), `src/shared/db/` (pool, `PgUnitOfWork`), `migrations/`.

Every public service method is declared on an interface before its implementation. No implementation is referenced by a consumer except through its interface plus a composition factory (`createLeaveService`, `createPolicyService`).

`reversesRequestId` is a field on the `LeaveRequest` entity, consumed by exactly one backend module (`leave`), so it stays in `src/modules/leave/leave.model.ts` and is NOT promoted to `src/shared/types/`. On the web root, `LeaveRequestView` is imported by `web-leave`, `web-approvals` and `web-presentation-pages`, so the new field is added to `web/src/shared/types/index.ts`.

### PORT environment variable

- **`shared-config`** (`src/shared/config/`) — owns `IPortResolver`, `PortResolver`, `DEFAULT_PORT = 3000`, `PortSource`, the canonical validity predicate, and the public `index.ts` entry point. Pure: no Fastify, no app instance, no `process.env` read (the caller passes the raw value).
- **`bootstrap`** (`src/`) — owns `src/index.ts`, the composition root: reads `process.env.PORT`, resolves it through `IPortResolver`, calls `app.listen({ port, host: '0.0.0.0' })`, emits the startup log line, and owns the failure path (`app.log.error` + `process.exit(1)`).
- **`app`** (`src/app.ts`) — Fastify instance construction, plugin and route registration. Unchanged by this feature.

### Readiness endpoint (`GET /ready`) — Module boundaries

- **Presentation** — `uptime.routes.ts`. `GET /ready` handler only: calls the service, reads the result's `ok` discriminator, maps it to 200/503 with a `ReadinessStatus` body, and logs the carried error via `request.log.error` on the failed check. No SQL, no business logic, no data access.
- **Application** — `UptimeService.checkReadiness()`. Owns the readiness predicate and the failure: probe resolves → `{ ok: true }`; probe rejects → `{ ok: false, error }` (the caught rejection, or the timeout `Error` when the 2000ms bound fired). It never throws and never logs — it hands the route something to log. Mapping the discriminator onto `ReadinessStatus` is the route's job.
- **Domain** — `ReadinessStatus` / `ReadinessState` / `ReadinessResult` in `uptime.model.ts`. Pure value types consumed by exactly one module, so per the placement rule they stay module-local and are NOT promoted to `src/shared/types/`.
- **Infrastructure** — `IReadinessRepository` / `PgReadinessRepository`. The only place the connectivity query is written; holds the shared pool from `src/shared/db`. Dependencies flow inward: routes → service → repository interface → shared-db.

`UptimeService` gains a **constructor-injected `IReadinessRepository` defaulting to `PgReadinessRepository`**, so the existing `new UptimeService()` call site in `uptime.routes.ts` keeps compiling and `/uptime` is untouched. This is also the seam the unit tests use.

### Audit trail for a leave request

- **Presentation** — `src/modules/leave/leave.routes.ts`. `GET /leaves/:id/history` handler only: `resolveActor`, `request.params.id`, call the service, `reply.status(200).send(entries)`, `try/catch -> request.log.error -> sendError`. No controller file. No SQL, no business logic, no role branch.
- **Application** — `LeaveService.getHistory(actor, requestId)` (orchestration + visibility) and `AuditService.getByEntity(entityType, entityId)` (entity-scoped read). Both declared on their interfaces before implementation.
- **Domain** — `AuditLog` (audit, lifecycle RECORDED), `AuditTrail` (audit, EMPTY | POPULATED), `LeaveRequest` (leave). No new domain type is introduced.
- **Infrastructure** — `PgAuditLogRepository.findByEntity` (the only place the entity query is written), `PgLeaveRequestRepository` (unchanged), `src/shared/db` pool.

Dependencies flow inward: routes -> service interfaces -> repository interfaces -> shared-db. No new edge is added by this feature; every edge in the dependency map already exists.

## Cross-cutting contracts

### Leave management (core)

- Auth: JWT bearer; request.user { id, role: EMPLOYEE|MANAGER|ADMIN }; requireRole guard; no self-approval.
- Error: { error, code }; 400/401/403/404/409.
- Transaction: service-owned IUnitOfWork.withTransaction; repositories accept optional PoolClient; BEGIN/COMMIT/ROLLBACK only in PgUnitOfWork.

### Leave cancellation

- **Auth**: request.user: { id: string; role: EmployeeRole } where EmployeeRole = 'EMPLOYEE' | 'MANAGER' | 'ADMIN'. JWT bearer verified by auth middleware; resolveActor validates presence/role at API boundary; RBAC enforced in service (owner DRAFT/SUBMITTED, direct-manager APPROVED), never inline in route.
- **Error**: Errors return { error: string; code: string }. Validation -> 400 ValidationError; auth -> 401 UnauthorizedError; authorization -> 403 ForbiddenError; not found -> 404 NotFoundError; invalid state transition -> 409 ConflictError; other -> 500.
- **Transaction**: Cancellation is atomic via IUnitOfWork.withTransaction (PgUnitOfWork: PoolClient, BEGIN, callback, COMMIT/ROLLBACK, release). Repository/service methods that join a caller transaction take optional trailing PoolClient; cancel passes client to ILeaveRepository.update, IBalanceRepository.update, IAuditService.record, INotificationService.create. Balance reads before write use findByKey with forUpdate=true.

### Authentication and read endpoints

- **Auth**: `request.user: { id: string; role: EmployeeRole }` where `EmployeeRole = 'EMPLOYEE' | 'MANAGER' | 'ADMIN'`. Identity/role obtained from a JWT bearer token verified by the existing `registerAuth` preHandler (`src/shared/auth/index.ts`), which populates `request.user` from `payload.sub` (id) and `payload.role`. RBAC enforced at the API boundary by `resolveActor` and in services (role-scoped visibility), never inline in routes. `POST /auth/login` is added to the public path set; all other new endpoints require a valid token.
- **Error**: errors return `{ error: string; code: string }`. Validation failure -> HTTP 400 (ValidationError); authentication failure -> 401 (UnauthorizedError); authorization failure -> 403 (ForbiddenError); not found -> 404 (NotFoundError); invalid state transition -> 409 (ConflictError); other -> 500. `POST /auth/login` returns the SAME status and message for wrong email and wrong password (401 UnauthorizedError). `GET /leaves/:id` returns the SAME 404 NotFoundError for a request the caller may not see as for one that does not exist.
- **Transaction**: none required — this feature is read-only plus a single non-persistent login write; read endpoints must not open a transaction.

### UTC accrual date helpers — Contracts

- Auth: none (no API surface).
- Error response: none (no API surface).
- Transaction: none (no writes).

### Policy composition factory

- Auth contract: unchanged; no new API surface or role-gated access.
- Error/response contract: unchanged; no new endpoints.
- Transaction contract: none for this feature; no writes or new data-access paths.

### Web frontend — login and employee leave view

- **Auth**: consumes backend contract; `request.user = { id: string; role: EmployeeRole }`, `EmployeeRole = 'EMPLOYEE' | 'MANAGER' | 'ADMIN'`; JWT bearer verified server-side; frontend sends `Authorization: Bearer <token>`, stores token, redirects to login on any 401.
- **Error**: `{ error: string; code: string }`; 400 validation, 401 auth, 403 forbidden, 404 not found, 409 conflict, 500 other. Login failure shows server message verbatim; no email enumeration.
- **Transaction**: none — read-only; login is a single non-persistent write.

### Seeded demo account and dev run — Contracts

- **authContract**: none — no API endpoints or role-gated access.
- **errorResponseContract**: none — no API endpoints.
- **transactionContract**: none — seed is idempotent and re-runnable; no runtime multi-step atomic write.

### Web leave workflow

- **Auth**: Existing session contract reused; no new API surface. AuthSession { token, profile: EmployeeProfile, status } held in AuthContext. Identity/role come from profile.role (EmployeeRole = 'EMPLOYEE' | 'MANAGER' | 'ADMIN') fetched via GET /employees/me; JWT is never decoded in the browser. ApiClient attaches bearer token from ITokenStorage and clears it on 401. Route-level access enforced by RequireAuth; action-level visibility enforced by getAvailableLeaveActions(status, role, isOwner) in pages — forbidden actions are never rendered.
- **Error/response**: ApiError { error: string; code: string } mapped from non-2xx bodies. Validation failure → 400; authentication → 401; authorization → 403; not found → 404; conflict → 409. RequestLeavePage and LeaveDetailPage display ApiError.message (the backend's own error text, e.g. insufficient balance) rather than a generic failure. Client-side validation failures (missing dates, end < start, no type) are caught before any network call and shown inline.
- **Transaction**: None. Each write action is a single HTTP call to an existing backend endpoint; atomicity is owned by the backend's IUnitOfWork/PgUnitOfWork contract, out of scope for this web/ change.

### Manager approvals queue (web)

- **Auth**: Identity/role from EmployeeProfile (GET /employees/me) held in auth session; EmployeeRole = 'EMPLOYEE' | 'MANAGER' | 'ADMIN'. /approvals wrapped in RequireAuth + RequireApprover; non-MANAGER/ADMIN redirected.
- **Error**: No new API endpoints; page surfaces existing ApiError failures (message + optional code) from reused api-client methods. Rejected decision rendered inline without manual reload; empty queue distinct non-error state.
- **Transaction**: EMPTY — read-only queue plus single existing API writes; atomicity owned by backend.

### Dashboard leave balances

- **Auth**: No new API surface or role-gated access; dashboard already behind existing authenticated session. Contract intentionally empty.
- **Error response**: No new endpoints; existing `GET /balances/me` unchanged. Contract intentionally empty.
- **Transaction**: Read-only feature; no multi-step writes. Contract intentionally empty.

### GP-008 reversal — lifecycle immutability

**Auth** — `request.user: { id: string; role: EmployeeRole }` where `EmployeeRole = 'EMPLOYEE' | 'MANAGER' | 'ADMIN'`. Identity and role come from a JWT bearer token verified by the existing `registerAuth` preHandler (`src/shared/auth/index.ts`), which populates `request.user` from `payload.sub` (id) and `payload.role`; only `/auth/login` is in `PUBLIC_PATHS`. RBAC is enforced at the API boundary by the route-level `resolveActor` helper (throws `UnauthorizedError` on a missing/invalid actor) and in the service by `assertAuthenticated`/`assertCanCancel`/`assertCanDecide` — never inline in a route handler. This feature adds no new endpoint and no new role: `POST /leaves/:id/cancel` keeps its existing authorization, and the reversal row inherits the original's `employeeId`, so role-scoped visibility applies to it unchanged.

**Error response** — errors return `{ error: string; code: string }`. Validation failure -> HTTP 400 (`ValidationError`, code `VALIDATION`); authentication failure -> 401 (`UnauthorizedError`, code `UNAUTHORIZED`); authorization failure -> 403 (`ForbiddenError`, code `FORBIDDEN`); not found -> 404 (`NotFoundError`, code `NOT_FOUND`); invalid state transition -> 409 (`ConflictError`, code `CONFLICT`); any other throw -> 500 `{ error: 'Internal Server Error' }`. `GET /leaves/:id` returns the same 404 for a request the caller may not see as for one that does not exist. This feature adds no new status code: cancelling an APPROVED request still returns 200 with the new CANCELLED reversal row, and the existing guards keep their current 409/403 responses.

**Transaction / unit of work** — cancelling an APPROVED request performs, in one unit of work: (a) insert the new CANCELLED reversal row, (b) release `requestedDays` from `used_days` on the balance row, (c) write the CANCEL audit entry, (d) insert the cancellation notification. Repository and service methods that must join a caller's transaction take an OPTIONAL trailing `client?: PoolClient` parameter, defaulting to the shared pool (`src/shared/db/connection.ts`) when omitted. The calling service owns the unit of work: `LeaveService.cancel` calls `this.uow.withTransaction(async (client) => { ... })` (`PgUnitOfWork` acquires a client from the shared pool, BEGIN, runs the callback, COMMIT on resolve / ROLLBACK on throw, always releases). Inside the callback the same `client` is threaded to every participating call: `repository.findByReversesRequestId(originalId, client)`, `repository.create(reversalInput, client)`, `balanceRepository.findByKey(..., client, true)` (row lock) then `balanceRepository.update(balanceId, { usedDays: ... }, client)`, `auditService.record(entry, client)`, `notificationService.create(input, client)`. BEGIN/COMMIT/ROLLBACK appear only in `PgUnitOfWork` — never in a repository or service. The DRAFT/SUBMITTED in-place cancellation uses the same contract. Read paths (`list`, `getById`) open no transaction and forward no client.

### PORT environment variable

- **authContract: EMPTY.** No endpoint, no role-gated access, no identity is read or enforced.
- **errorResponseContract: EMPTY.** No API surface is added or changed.
- **transactionContract: EMPTY.** Zero writes, so there is no multi-step write to make atomic and no unit of work to own. The existing contract (service-owned `IUnitOfWork.withTransaction`; repositories accept an optional trailing `PoolClient` defaulting to the shared pool) is unaffected and must not be extended to cover startup.

### Readiness endpoint (`GET /ready`) — Cross-cutting contracts

**Auth / identity.** `request.user: { id: string; role: EmployeeRole }` where `EmployeeRole = 'EMPLOYEE' | 'MANAGER' | 'ADMIN'`, populated by the existing `registerAuth` preHandler in `src/shared/auth/index.ts` (JWT bearer verified via `jwt.verify`, `payload.sub` → id, `payload.role` → role). RBAC is enforced by route-level guards, never inline. **This feature's endpoint is the documented exception:** `GET /ready` is an unauthenticated infrastructure probe, so it is added to the `PUBLIC_PATHS` set alongside the existing `/uptime`, `/health`, and `/auth/login`, and carries no `resolveActor` call and no role guard. GP-005 is therefore not applied to `/ready` — the same exemption the existing `/uptime` liveness endpoint already relies on. No new role, no new token claim, no change to the identity shape.

**Error / response.** `GET /ready` uses a **fixed body with no error envelope**. Success: HTTP 200 `{ status: 'ready' }`. Not ready: HTTP 503 `{ status: 'not-ready' }` — 503 is the readiness signal, not an error response, and it carries no error detail, no message, and no code field. The raw probe error is never placed in the body; it is logged via `request.log.error(error)` exactly as `/uptime` does. An unexpected throw outside the probe path falls through to the app-level handler as HTTP 500 `{ error: 'Internal Server Error' }`, matching the existing `/uptime` behaviour. The standard `{ error, code }` envelope and the 400/401/403/404 cases do not apply: the endpoint takes no input (no validation failure), is unauthenticated (no 401/403), and addresses no resource (no 404).

**Transaction / unit of work.** None. Readiness is a single trivial read-only query with no writes, so no transaction is opened and `IUnitOfWork` is not involved. The repository's `check()` deliberately takes no optional `PoolClient` so the probe can never join a caller's transaction.

### Audit trail for a leave request

**Auth.** `request.user: { id: string; role: EmployeeRole }` where `EmployeeRole = 'EMPLOYEE' | 'MANAGER' | 'ADMIN'`. Identity and role come from a JWT bearer token verified by the existing `registerAuth` preHandler (`src/shared/auth/index.ts`), which populates `request.user` from `payload.sub` (id) and `payload.role`; only `/auth/login` is in `PUBLIC_PATHS`, so `GET /leaves/:id/history` requires a valid token. The route-level `resolveActor` helper (reused unchanged from `leave.routes.ts`) extracts `request.user` and enforces id presence plus `EmployeeRole` membership at the API boundary, throwing `UnauthorizedError` on a missing/invalid actor. RBAC is NOT enforced inline in the route and no role guard is added: the endpoint's authorization is the service's existing `LeaveService.getById(actor, requestId)` call, which owns the visibility rule and throws `NotFoundError` for a request the caller may not see. No new role, no new claim, no change to the identity shape.

**Error response.** Errors return `{ error: string; code: string }` via the existing `sendError` helper (`AppError` -> its `statusCode` + `code`; any other throw -> 500 `{ error: 'Internal Server Error' }`). For `GET /leaves/:id/history`: validation failure -> 400 (`ValidationError`, code `VALIDATION`) for a malformed `entityType`/`entityId` reaching the audit service; authentication failure -> 401 (`UnauthorizedError`, code `UNAUTHORIZED`) for a missing or invalid actor; authorization failure -> 403 (`ForbiddenError`, code `FORBIDDEN`) is NOT produced by this endpoint — a caller who may not see the request receives the SAME 404 as a nonexistent id, so existence is never leaked; not found -> 404 (`NotFoundError`, code `NOT_FOUND`) for both an invisible and a nonexistent request, byte-identical. Success: 200 with an array of `{ id, actorId, action, entityType, entityId, beforeState, afterState, occurredAt }` ordered oldest first; an existing, visible request with no audit rows returns 200 with `[]` (never 404). No 409 is produced (read-only).

**Transaction.** EMPTY — this feature is read-only. It writes no audit record, opens no transaction, and forwards no `PoolClient`. The existing `IUnitOfWork` contract is untouched; GP-002 is not engaged by a read.

## Ownership and naming decisions

### Leave management (core) — Canonical naming decisions

- EmployeeRole: EMPLOYEE | MANAGER | ADMIN (replaces hr_admin).
- LeaveTypeCode: annual | sick | emergency | unpaid | maternity | paternity (lowercase persisted values — supersedes the earlier ANNUAL|SICK|EMERGENCY-only position).
- EmploymentStatus: ACTIVE | TERMINATED | ON_LEAVE (drops INACTIVE).
- AuditRecord is canonicalized as AuditLog.
- LeaveType is a first-class entity with its own table and module.

### Leave cancellation — Resolved conflicts

- Added `cancelled_by` and `cancelled_at` to leave_requests to match LeaveRequest.cancelledBy/cancelledAt.
- Added AuditAction.CANCEL to shared-types (resolves data open question).
- Balance release uses canonical inclusive day count: requestedDays = endDate - startDate + 1.

### Readiness endpoint (`GET /ready`) — Reconciliation decisions

- **Canonical data-access name:** `IReadinessRepository` / `PgReadinessRepository` with `check(): Promise<void>` (the data slice's naming) supersedes the application slice's `IDatabaseProbe` / `PgDatabaseProbe` with `ping()`. Rationale: it keeps the connectivity query behind a repository interface per GP-001 and inside the established `uptime.repository.interface.ts` / `uptime.repository.ts` convention, which resolves the application slice's own GP-001 open question rather than carrying it forward. The deliberate divergence (no optional trailing `PoolClient`) is retained.
- **Canonical service method:** `checkReadiness()` on `IUptimeService` / `UptimeService` (application slice). No competing name existed.
- **`src/modules/status/`** is NOT used, extended, or reconciled. It is a second, unused health-shaped concept (`SystemStatus`, `StatusService.getStatus()`), unregistered in `src/app.ts`. Flagged as a dead-code decision, not a boundary to reconcile.
- **`docs/DOMAIN.md`** is stale relative to this document (it still records `LeaveRequest.leaveTypeId`, `approvedBy`/`approvedAt`, and `EmploymentStatus.INACTIVE`). The readiness entities above should be added under a `system`/`uptime` section rather than appended to the stale `system` block.

### Audit trail for a leave request — Ownership (the load-bearing constraint)

The visibility rule (ADMIN sees all; MANAGER sees own plus direct reports, one level only; anyone else only own) is owned by `leave` and expressed in exactly one place: the existing `LeaveService.getById`. `getHistory` calls it first and lets it throw. The audit module gains a purely mechanical `entityType + entityId` query and **never** branches on `EmployeeRole` — HARNESS.json declares `EmployeeRole` an owned decision whose owners are `leave` and `web-leave`. The route adds no role guard either: authorization is the service's `getById` call, and the 404 it already produces is the response for both invisible and nonexistent ids (no 403, no existence leak).

## Open questions

_Carried forward from the feature blocks. A question is retired only when the
clarification record shows it answered, or when the block's own stated resolution is
VERIFIED against the tree. 11 were retired that second way; the clarification record
retired none, because it holds no answers at all — 41 parks, 318 questions, 0 answers,
all time (`provenance='recovered'`)._

- **GP-008 reversal trail** — should a reversal row have a non-empty trail of its own, or is the empty trail correct (the reversal is an event in the ORIGINAL's history)?
  _(feature `594d4d13` · no resolution recorded anywhere)_
- **`beforeState`/`afterState` exposure** — the trail is visible to exactly the callers who may see the request, but it makes full snapshots bulk-readable and reveals the `actorId` of every actor who touched the request. Redaction must be decided now if wanted, because the projection rule is binding feature-wide.
  _(feature `594d4d13` · no resolution recorded anywhere)_
- **Index extension** — should `(entity_type, entity_id)` be extended with `occurred_at` (and `id`) so the ordered scan is index-served? A migration decision that must be made once for the table.
  _(feature `594d4d13` · no resolution recorded anywhere)_
- **`occurred_at` clock authority** — app-stamped `new Date()` vs the column's DB default `now()`; the DB default is currently dead code for every row the repository inserts.
  _(feature `594d4d13` · no resolution recorded anywhere)_
- **`entity_type` literal ownership** — the leave module owns `LEAVE_REQUEST_ENTITY_TYPE` (defined once in `src/modules/leave/leave.model.ts` and imported by both the write path and the history read); a divergence would silently return an empty array, which this contract treats as a valid 200.
  _(feature `594d4d13` · no resolution recorded anywhere)_
- **`getHistory` return type** — the audit-owned `AuditLog` entity as-is (leading option; it must not be promoted to `src/shared/types/` and must not be re-declared in leave) vs a leave-owned projection.
  _(feature `594d4d13` · no resolution recorded anywhere)_
- **Unbounded response size** — pagination and filtering are out of scope, so the endpoint returns the full trail with no cap.
  _(feature `594d4d13` · no resolution recorded anywhere)_
- **GET /leaves list shape** — still open: the read path returns both rows unchanged, paired by `reversesRequestId`. Every existing consumer (LeaveListPage, ApprovalsPage, DashboardPage) will render two rows unless it learns to filter.
  _(feature `79f682f0` · the block itself says STILL OPEN)_
- **Aggregation double-counting** — **still open.** The reversal row copies `requestedDays`/dates from the original (never re-derived, never zeroed), so any aggregation that sums `requestedDays` must filter on `reverses_request_id IS NULL` or the original APPROVED row and its reversal row are double-counted. The constraint is correct and binding feature-wide; what is NOT resolved is the hazard it describes — **no aggregation exists yet and nothing enforces the filter** (verified: no `SUM(requested_days)` anywhere in `src/`). It returns to `still open` because a constraint written down is not a constraint enforced.
  _(feature `79f682f0` · the block itself says STILL OPEN)_
- Demo credentials: hardcoded vs env-driven with defaults.
  _(feature `b020624d` · no resolution recorded anywhere)_
- **Caching / memoization** — the binding rule says no caching; a future TTL would introduce a staleness bound and a third probe concern. Still open as a future concern only — the delivered path caches nothing, and Phase 3 pins this with a test asserting a fresh `check()` on every call (two calls → probe called twice).
  _(feature `dfc85052` · the block itself says STILL OPEN)_
- **Readiness-path request-log volume** — the app runs Fastify's request logging globally, so a probe polled on a short interval emits a log line per poll. No per-route logging configuration or sampling was added; the existing global behaviour is accepted. Open as an operational concern.
  _(feature `dfc85052` · no resolution recorded anywhere)_
- Employee column rendering: API exposes employeeId but no employee name; web employee service only getMe(). Options: render employeeId as-is, omit column, or resolve from existing list (none exists). <!-- gestalt:architecture feature=e04c2d94-ea14-4e1c-bf05-aec38b138bb0 END -->
  _(feature `e04c2d94` · no resolution recorded anywhere)_
- Q1: Should a controller layer be introduced, or continue with routes calling services directly? (candidates: continue routes-call-services; introduce controllers)
  _(feature `e8c586bc` · no resolution recorded anywhere)_
- Q2: Should LeavePolicyStatus be promoted into src/shared/types as a canonical enum? (candidates: promote to shared/types; keep module-local and import via policy index.ts) <!-- gestalt:architecture feature=e8c586bc-23c0-4c59-9111-ee280659da9a END -->
  _(feature `e8c586bc` · no resolution recorded anywhere)_
- Token storage mechanism (localStorage/sessionStorage/in-memory)
  _(feature `ecef04ad` · no resolution recorded anywhere)_
- Proactive JWT expiry detection vs server 401 only
  _(feature `ecef04ad` · no resolution recorded anywhere)_
- UTC date rendering implementation (Date.UTC/getUTC*, Intl timeZone UTC, raw YYYY-MM-DD substring)
  _(feature `ecef04ad` · no resolution recorded anywhere)_
- **OQ-1 — Confirm the strict validity predicate** (trim, `/^[0-9]+$`, 1..65535). The domain slice records this as a binding rule; the data and app slices recorded it as undecided and offered lenient `parseInt`/`Number` alternatives. Reconciliation adopts strict; confirm before implementation.
  _(feature `ed7419c9` · no resolution recorded anywhere)_
- **OQ-2 — Silent fallback vs warning** when PORT is present but invalid. The domain binding rule currently mandates silence; the operability concern (a typo'd PORT becomes invisible) remains.
  _(feature `ed7419c9` · no resolution recorded anywhere)_
- **OQ-3 — Log sink** for the startup line: keep `console.log` (current) or move to `app.log.info`.
  _(feature `ed7419c9` · no resolution recorded anywhere)_
- **OQ-4 — Scope of `shared-config`**: PORT only now (adopted), or migrate `DATABASE_URL` and `JWT_SECRET` into it in this feature.
  _(feature `ed7419c9` · no resolution recorded anywhere)_

## Feature history

Each feature's original architecture block, verbatim:

- `.gestalt/5710baba-c42d-4743-bc05-ce5effb0f951/architecture/history.md`
- `.gestalt/594d4d13-f841-45ca-9302-ff8e3c249e07/architecture/history.md`
- `.gestalt/621bb1fd-0965-415a-bf2e-ec2c42b15f04/architecture/history.md`
- `.gestalt/79f682f0-f52a-4751-b803-2b0059522cdd/architecture/history.md`
- `.gestalt/7d61f09d-b7fc-45d9-8704-fa055d377b19/architecture/history.md`
- `.gestalt/7dc62161-0bad-4567-84a9-bea333846c6b/architecture/history.md`
- `.gestalt/957fb3ff-3b3a-4d0e-9273-8b37869e315c/architecture/history.md`
- `.gestalt/b020624d-f000-464a-871e-edfa5e57ac4e/architecture/history.md`
- `.gestalt/babd3932-368b-46a5-a4dc-6dccaafd84ba/architecture/history.md`
- `.gestalt/dfc85052-311e-4b5d-b9d5-a4e1ec28165e/architecture/history.md`
- `.gestalt/e04c2d94-ea14-4e1c-bf05-aec38b138bb0/architecture/history.md`
- `.gestalt/e8c586bc-23c0-4c59-9111-ee280659da9a/architecture/history.md`
- `.gestalt/ecef04ad-9a9b-43d8-bac9-03098d9c566a/architecture/history.md`
- `.gestalt/ed7419c9-c171-4d5d-9d12-62ba16e78d54/architecture/history.md`
