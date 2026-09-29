# Golden Principles — {{projectName}}

These invariants are non-negotiable. Violations produce
`GOLDEN_PRINCIPLE_BREACH` signals and pause the cycle for human review.
The breach RECORD is closed only by a human; a breach whose findings name a
file may first get one bounded, audited corrective pass that must re-gate
(platform GP-003 / ADR-075).

Stylistic rules and architectural conventions (no-any, no-direct-db,
no-hardcoded-secrets, etc.) live in `HARNESS.json` under
`constraints.rules` and produce `CONSTRAINT_VIOLATION` signals that the
platform can auto-retry. The eight principles below are the ones that
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

## GP-007 — UUIDs in all external interfaces

Internal database identifiers (auto-increment integers, sequences) are never
exposed in API responses, URLs, or client-side code. All external identifiers
are UUIDs.

## GP-008 — Approval workflows are immutable once completed

A completed approval cannot be modified or deleted. Status transitions are
one-way (`draft → submitted → approved/rejected`); a reversal creates a new
instance that references the original.
