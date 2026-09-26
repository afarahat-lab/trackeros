# Golden Principles — trackeros

These invariants are non-negotiable. Violations produce
`GOLDEN_PRINCIPLE_BREACH` signals and pause the cycle for human review —
they are never auto-resolved by the platform.

Stylistic rules and architectural conventions (no-any, no-direct-db,
no-hardcoded-secrets, etc.) live in `HARNESS.json` under
`constraints.rules` and produce `CONSTRAINT_VIOLATION` signals that the
platform can auto-retry. The six principles below are the ones that
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

## GP-007 — Completed approvals are immutable

Once a leave request reaches APPROVED, its `status`, `approverId`,
`approvalComment` and `decidedAt` are never written again. Reversing an
approved request creates a NEW `leave_requests` row (status CANCELLED)
that references the original via `reversesRequestId`; the original row
stays byte-identical. Enforced at the data-access layer by omission —
the reversal path calls `create`, never `update` on the original, and
`reversesRequestId` is absent from `UpdateLeaveRequestDto` and from the
repository's `FIELD_COLUMNS` map so it can never be mutated.

## GP-008 — A reversal releases the balance exactly once

Reversing an approved request releases the original's `requestedDays`
back from `usedDays` exactly once, inside the same unit of work as the
reversal insert, the audit records and the notification. The at-most-one
reversal per original is enforced by a partial unique index on
`reverses_request_id` (`WHERE reverses_request_id IS NOT NULL`), which
the repository surfaces as `ConflictError` (409) rather than a raw
driver error. See `docs/ARCHITECTURE.md` for the full mechanics.
