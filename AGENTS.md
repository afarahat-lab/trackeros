# AGENTS.md — trackeros

This file is the primary agent orientation document for this project.
Read this file completely before taking any action.

## What this project is

Trackeros — a corporate operations web and mobile platform for
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
  
  Tests: Vitest for the React/Vite web frontend; Jest for the
  Fastify API. CI on GitHub Actions
  runs lint (ESLint) + typecheck (tsc --noEmit) + unit tests +
  a Semgrep security pass on every PR. Conventional Commits +
  squash-merge. Strict TypeScript (no implicit any, strict
  null checks).

## Project stack

- Runtime: Node 20 LTS
- Package manager: npm
- Test framework: Jest (API) / Vitest (web)
- Backend: Fastify
- Frontend: React + Vite
- Database: PostgreSQL

See `docs/ARCHITECTURE.md` for the full architecture overview and
module layout.

Note: the Gestalt platform itself runs on Node 20 + pnpm 9.x as a
self-imposed constraint. That has no bearing on this project —
user projects use whatever stack matches their description.

## Architecture rules

1. Modules never import from each other's internals — only from index.ts
2. All database access through the repository pattern
3. Every state-changing operation produces an audit record (GP-001)
4. RBAC enforced at middleware, never inline (GP-002)
5. Transactions: the SERVICE owns the unit of work, the DATA-ACCESS layer opens it

### 5 — transaction boundaries (decided 2026-08-30)

"The service owns the unit of work" and "all database access goes through repository
interfaces" (GP-001) are not in conflict. They govern two different things:

- **Owning the boundary** = deciding what is inside the transaction and what is not. That is a
  business decision (a status change, its balance counters and its audit row succeed or fail
  together) and it belongs to the service.
- **Acquiring the connection** = getting a client from the pool, `BEGIN`, `COMMIT`/`ROLLBACK`,
  release. That is database access, so it lives behind an interface in the data-access layer.

**The decision:** a data-access unit-of-work abstraction, injected into services the same way
repositories are.

```ts
interface IUnitOfWork {
  withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T>;
}
```

Its implementation acquires a client, issues `BEGIN`, runs the callback, then `COMMIT` — or
`ROLLBACK` on any throw — and always releases in a `finally`. It is the ONLY place in the
codebase that issues `BEGIN` / `COMMIT` / `ROLLBACK`. Services receive it via the constructor
and never import a pool, a client, or a module-level helper directly.

```ts
await this.uow.withTransaction(async (client) => {
  await this.leaveRequestRepo.updateStatus(id, 'APPROVED', client);
  await this.balanceService.commitDays(employeeId, type, days, client);
  await this.auditService.record(entry, client);
});
```

Participating repository and service methods take the client as an **optional last parameter**
and use it when supplied, falling back to the shared pool when omitted — so single-step callers
are unaffected. A nested `withTransaction` must reuse an already-supplied client rather than
opening a second transaction.

**Rejected:** putting `withTransaction` on a repository (e.g. the leave-request repository) or
having a repository method take the callback. The transaction spans `leave_requests`,
`leave_balances` and `audit_logs`, so making one aggregate's repository own a boundary crossing
three of them is arbitrary — the other repositories would receive a client originating from a
sibling they know nothing about, and a future transaction not involving leave requests would
have nowhere to live. It also makes that one repository structurally unlike every other, for
reasons unrelated to leave requests.

Introducing a unit of work moves no invariant: negative guards and authorization stay in the
services that already own them.

### 5a — row locks for read-then-write (decided 2026-09-14)

Being inside a transaction is NOT enough to make a read-then-write safe. PostgreSQL's default
isolation (READ COMMITTED) lets two concurrent transactions read the same row and compute the
same delta; the second write silently discards the first. The leave-balance counters
(`pendingDays`, `usedDays`) are computed in application code — read the row, add/subtract, write
the result — so every read that precedes a write must take a row-level lock.

**The rule:** when a service reads a row inside a transaction and then writes it, the read must
pass `forUpdate = true` (`SELECT ... FOR UPDATE`). `IBalanceRepository.findByKey(..., client,
forUpdate)` and `findById(..., client, forUpdate)` implement this; the lock clause is emitted
only when an explicit `client` is supplied, because a lock taken outside a transaction is
released immediately and buys nothing. Reads that only validate — e.g. `LeaveService.create`'s
balance lookup — pass `forUpdate = false` and take no lock. `LeaveService.submit` / `approve` /
`reject` / `cancel` all lock the balance row before writing it, and `approve` / `reject` assert
`pendingDays >= requestedDays` (`ConflictError` otherwise) so a lost update cannot drive the
counter negative.

**A state change and its audit record are ONE unit of work.** `LeaveService.create` wraps the
DRAFT insert and its CREATE audit entry in a single `withTransaction`; written separately, a
failing audit insert left a persisted request with no audit trail (GP-002).

### 5b — an approved leave request is reversed, not mutated (decided 2026-09-15)

Once a leave request is APPROVED its row is immutable (GP-008). `LeaveService.cancel` splits on
status: DRAFT and SUBMITTED keep their in-place behaviour (the same row is updated to CANCELLED
with `cancelledBy`/`cancelledAt`; SUBMITTED releases `pendingDays`), while APPROVED inserts a
NEW `leave_requests` row with `status = CANCELLED` and `reversesRequestId` pointing at the
original, and performs **no update at all** on the approved row.

The APPROVED branch runs inside the same single `withTransaction` and, in order: guards against
a second reversal via `repository.findByReversesRequestId` (`ConflictError`, 409 — never an
idempotent 200; the repository's Postgres `23505` → `ConflictError` mapping is the concurrency
backstop behind the partial unique index on `reverses_request_id`); releases the balance exactly
once from the locked row (`usedDays -= original.requestedDays`, `pendingDays` untouched); inserts
the reversal row (verbatim `employeeId`/`leaveTypeCode`/`startDate`/`endDate`, `requestedDays: 0`,
null approval fields); writes TWO `AuditAction.REVERSE` records (one per row, so neither is left
unaudited); and sends one notification whose `relatedEntityId` is the NEW row id. It returns the
reversal row.

The released quantity is always read from the ORIGINAL row's `requestedDays` via
`reversesRequestId` — never re-derived from the dates. The pre-transaction guards
(`assertCanCancel`, the `startOfUtcDay` timing guard) are unchanged and still govern the APPROVED
path.

### 5c — the reversal read model (decided 2026-09-16)

A reversed request is TWO rows, and the read model must not hide that. `ILeaveRepository.findByQuery`
returns originals AND reversal rows when no reversal filter is supplied — a wire contract that
silently omits state is how a client comes to believe an approved request is still live.
`LeaveRequestQueryParams.reversesRequestId?: string` is the ONE optional filter; its absence means
"no reversal constraint", never "exclude reversals". `reversesRequestId` is returned on every read
path (`findById`, `findByQuery`) via `mapRow`/`COLUMNS`: null for an ordinary request, the
original's id for a reversal row. The filter is applied at the type/repository layer only —
`leave.routes.ts` `parseQuery` is NOT changed, so it is not yet exposed over the wire.

Consequences to remember:

- **An unfiltered `GET /leaves` counts a reversed request TWICE** — the untouched APPROVED
  original and the CANCELLED reversal both appear. Row counts must de-duplicate via
  `reversesRequestId` (drop a CANCELLED row whose original is also present) or filter explicitly.
  Day-count aggregates that sum `requestedDays` are NOT inflated, because the reversal carries
  `requestedDays = 0`.
- **`status=CANCELLED` is a derived partition, not a synonym**: it returns BOTH in-place
  cancellations (`reversesRequestId = null`, DRAFT/SUBMITTED origin) and reversal rows
  (`reversesRequestId != null`, APPROVED origin). The two are discriminated ONLY by
  `reversesRequestId`.
- **A reversed original NO LONGER occupies its dates**: any overlap / "already on leave" check
  must exclude APPROVED rows that have a reversal pointing at them. The balance was released, so
  the employee has those days back; leaving the dates occupied would refund the days and
  simultaneously forbid re-booking them. Nothing consumes this rule yet — it is recorded so a
  later check is not written against the wrong assumption.

## What agents must never do

- Violate principle GP-003 as defined in `GOLDEN_PRINCIPLES.md`.
- Violate principle GP-004 as defined in `GOLDEN_PRINCIPLES.md`.
- Violate principle GP-005 as defined in `GOLDEN_PRINCIPLES.md`.
- Violate principle GP-006 as defined in `GOLDEN_PRINCIPLES.md`.
- Violate principle GP-007 as defined in `GOLDEN_PRINCIPLES.md`.
- Violate principle GP-008 as defined in `GOLDEN_PRINCIPLES.md`.

## When context is missing

Emit a `CONTEXT_GAP` signal with the specific missing information identified.

## Operator notes — Git credential scopes

The personal access token registered with this project drives BOTH the
platform's clone/push and the deploy layer's CI/CD calls. Required scopes:

- **GitHub PAT (classic)** — `repo` (clone, push, create PRs) +
  `workflow` (dispatch GitHub Actions workflows). Fine-grained PATs need
  Contents: read+write, Pull requests: read+write, Actions: read+write,
  Workflows: read+write.
- **GitLab Project Access Token** — `api` + `write_repository`.
- **Azure DevOps PAT** — `Code (Read & Write)` + `Build (Read & Execute)`.

Without the workflow scope the deploy layer's pipeline-agent will fail with
a `GOLDEN_PRINCIPLE_BREACH` signal and the intent will be escalated for
human review. Re-issue the PAT with the missing scope and re-register the
project to recover.

## Custom agents

Project-specific agents can be defined in `agents.yaml` under
`custom_agents`. They run after the framework generate agents
(intent / design / context / lint-config / code / test) and BEFORE
dispatch to the quality gate. Each custom agent receives the
generated artifacts as part of its prompt and returns structured
findings.

The orchestrator routes findings to typed signals the gate
evaluates:

- `high` severity findings → `CONSTRAINT_VIOLATION`
- `medium` / `low` findings → `LINT_FAILURE`
- LLM error or response parse failure → `CONTEXT_GAP`

Custom agents **never** emit `GOLDEN_PRINCIPLE_BREACH` — that
signal type is reserved for framework infrastructure agents and
the review-agent.

See `agents.yaml` for the full schema and a commented-out example.
Run `gestalt agents list <projectName>` to see the active agents
for this project; `gestalt agents validate <projectName>` checks
that your custom-agent definitions parse cleanly.
