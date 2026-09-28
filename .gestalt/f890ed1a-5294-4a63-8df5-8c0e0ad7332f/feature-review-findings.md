# Feature review findings

Findings from the FEATURE-level review — one pass over everything this feature built, scoped to its diff against the default branch. Per-phase gate findings live in each phase's `.gestalt/<correlation id>/` folder.

**1 open · 0 fixed** after 1 attempt.

A finding is `fixed` when an attempt stopped reporting it. Findings are never removed from this file — one that lists only what is currently broken cannot show you that anything got better.

| status | rule | location | first seen | resolved | finding |
|---|---|---|---|---|---|
| 🔴 open | `review/architecture` | `src/modules/leave/leave.service.ts:297` | attempt 1 | — | [review/architecture] The terminality guard only inspects the row's own `status`, but a reversal never mutates the original — after the first APPROVED cancellation the original row still reads `status: APPROVED`. So a second `POST /leaves/:id/cancel` on the ORIGINAL id passes this guard (and `assertCanCancel`, which permits an ADMIN/manager to cancel an APPROVED request), enters the transaction, and inserts a second reversal row, which the unique partial index rejects with a raw `DatabaseError` (`duplicate key value violates unique constraint "leave_requests_reverses_request_id_unique"`). The route's `sendError` maps that non-AppError to a 500, not the 409 the architecture's error contract specifies: docs/ARCHITECTURE.md states "This feature adds one 409 case: cancelling an APPROVED request that already has a reversal row throws ConflictError (the release-exactly-once guard)", and the phase spec's integrationPoints name `findByReversesRequestId` as "the already-reversed lookup the … |

## Offending lines

- **src/modules/leave/leave.service.ts:297** — `review/architecture` (open)

  ```
      if (request.status === LeaveStatus.CANCELLED) {
  ```
