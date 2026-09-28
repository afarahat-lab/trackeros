# Feature review findings

Findings from the FEATURE-level review — one pass over everything this feature built, scoped to its diff against the default branch. Per-phase gate findings live in each phase's `.gestalt/<correlation id>/` folder.

**1 open · 1 fixed** after 3 attempts.

A finding is `fixed` when an attempt stopped reporting it. Findings are never removed from this file — one that lists only what is currently broken cannot show you that anything got better.

| status | rule | location | first seen | resolved | finding |
|---|---|---|---|---|---|
| 🔴 open | `review/test-reliability` | `scripts/smoke.js:401` | attempt 2 | — | [review/test-reliability] Stage 9's cancellable span is clamped to `min(max(now, curPeriod.start) + 2 days, curPeriod.end - 1 day)`, but the lower bound is never re-checked against `now`. On the final UTC day of the accrual period the clamp collapses to `curPeriod.end - 1 day`, which is <= `now`, so the span is no longer future-dated. `LeaveService.cancel` then rejects it with the timing guard (`startOfUtcDay(request.startDate) <= startOfUtcDay(new Date())` -> ConflictError), so stage 9c's `POST /leaves/:id/cancel` returns 409 instead of 200 and the smoke run fails. Verified by simulating the shipped expression against the real `periodContaining`/`startOfUtcDay` logic for the seeded hireDate 2020-01-01 with accrualPeriodMonths 12: for `now = 2026-12-31T12:00Z` (period 2026-01-01..2027-01-01) the clamp yields `2026-12-31T00:00:00Z` and the timing guard blocks it, while `2026-12-30T12:00Z` passes. This is a date-dependent CI flake that reproduces on one day per accrual period, and it is … |
| 🟢 fixed | `review/architecture` | `src/modules/leave/leave.service.ts:297` | attempt 1 | attempt 2 | [review/architecture] The terminality guard only inspects the row's own `status`, but a reversal never mutates the original — after the first APPROVED cancellation the original row still reads `status: APPROVED`. So a second `POST /leaves/:id/cancel` on the ORIGINAL id passes this guard (and `assertCanCancel`, which permits an ADMIN/manager to cancel an APPROVED request), enters the transaction, and inserts a second reversal row, which the unique partial index rejects with a raw `DatabaseError` (`duplicate key value violates unique constraint "leave_requests_reverses_request_id_unique"`). The route's `sendError` maps that non-AppError to a 500, not the 409 the architecture's error contract specifies: docs/ARCHITECTURE.md states "This feature adds one 409 case: cancelling an APPROVED request that already has a reversal row throws ConflictError (the release-exactly-once guard)", and the phase spec's integrationPoints name `findByReversesRequestId` as "the already-reversed lookup the … |

## Offending lines

- **src/modules/leave/leave.service.ts:297** — `review/architecture` (fixed in attempt 2)

  ```
      if (request.status === LeaveStatus.CANCELLED) {
  ```

- **scripts/smoke.js:401** — `review/test-reliability` (open)

  ```
            Math.max(Date.now(), curPeriod.start.getTime()) + 2 * dayMs,
  ```
