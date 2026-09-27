# Golden Principles — trackeros

These invariants are non-negotiable. Violations produce
`GOLDEN_PRINCIPLE_BREACH` signals and pause the cycle for human review —
they are never auto-resolved by the platform.

Stylistic rules and architectural conventions (no-any, no-direct-db,
no-hardcoded-secrets, etc.) live in `HARNESS.json` under
`constraints.rules` and produce `CONSTRAINT_VIOLATION` signals that the
platform can auto-retry. The principles below are the ones that
get a human in the loop.

## GP-001 — Repository pattern

All database access goes through repository interfaces.
Never query the database directly from services or controllers.

## GP-002 — Audit records

All state-changing operations write an audit record.

## GP-003 — Input validation

Validate all inputs at API boundaries before processing.

## GP-004 — No sensitive data in logs

Never log passwords, tokens, PII, or financial data.

## GP-005 — RBAC enforcement

All API endpoints enforce role-based access control.

## GP-006 — Error handling

No unhandled promise rejections. All async errors are caught and handled.

## GP-007 — Transaction boundaries

The service owns the unit of work; the data-access layer opens it. A
service decides what is inside a transaction and receives an
`IUnitOfWork` by injection; only `PgUnitOfWork` issues
`BEGIN` / `COMMIT` / `ROLLBACK`. A state change and its audit record are
ONE unit of work. When a service reads a row inside a transaction and
then writes it, the read must take a row-level lock (`forUpdate = true`),
because the counters are computed in application code and READ COMMITTED
lets two concurrent transactions compute the same delta.

## GP-008 — Approved leave is reversed, not mutated

Once a leave request is APPROVED, its row is immutable. Cancelling an
APPROVED request performs NO update on that row — its `status` stays
APPROVED and its `approverId`, `approvalComment`, `decidedAt`,
`cancelledBy` and `cancelledAt` are untouched. The cancellation is
represented by a NEW `leave_requests` row with `status = CANCELLED` whose
`reversesRequestId` points at the original; the balance is released
exactly once, and both rows are audited (`AuditAction.REVERSE`), inside a
single unit of work. At most one reversal row may exist per original — a
second cancel is a `ConflictError` (409), never an idempotent success.
DRAFT and SUBMITTED cancellation keep their in-place behaviour (the same
row is mutated; `reversesRequestId` stays null).
