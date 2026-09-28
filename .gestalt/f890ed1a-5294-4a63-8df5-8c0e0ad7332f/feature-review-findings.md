# Feature review findings

Findings from the FEATURE-level review — one pass over everything this feature built, scoped to its diff against the default branch. Per-phase gate findings live in each phase's `.gestalt/<correlation id>/` folder.

**1 open · 1 fixed** after 2 attempts.

A finding is `fixed` when an attempt stopped reporting it. Findings are never removed from this file — one that lists only what is currently broken cannot show you that anything got better.

| status | rule | location | first seen | resolved | finding |
|---|---|---|---|---|---|
| 🔴 open | `review/test-reliability` | `scripts/smoke.js:395` | attempt 2 | — | [review/test-reliability] Stage 9's cancellable span is derived as `max(now, curPeriod.start) + 2 days`, but the comment above it requires the span to be INSIDE the current accrual period ("must be future-dated ... AND inside the CURRENT period, which is where stage 8 re-keyed bal-1 — otherwise resolveBalance finds no row and the request never reaches APPROVED"). When the smoke run happens within 2 days of the period end (for the seeded hireDate 2020-01-01 with accrualPeriodMonths 12, the period ends Jan 1), `now + 2 days` lands on or past `curPeriod.end`. `periodContaining` is half-open `[start, end)`, so `resolveBalance` then resolves the NEXT period, whose `leave_balances` row does not exist (stage 8 re-keyed `bal-1` to the current period only). `POST /leaves` returns 404 and stage 9a fails — a date-dependent CI flake that only reproduces near the period boundary. The span should be clamped to stay strictly inside `[curPeriod.start, curPeriod.end)` (e.g. anchor on `curPeriod.start` … |
| 🟢 fixed | `review/architecture` | `src/modules/leave/leave.service.ts:297` | attempt 1 | attempt 2 | [review/architecture] The terminality guard only inspects the row's own `status`, but a reversal never mutates the original — after the first APPROVED cancellation the original row still reads `status: APPROVED`. So a second `POST /leaves/:id/cancel` on the ORIGINAL id passes this guard (and `assertCanCancel`, which permits an ADMIN/manager to cancel an APPROVED request), enters the transaction, and inserts a second reversal row, which the unique partial index rejects with a raw `DatabaseError` (`duplicate key value violates unique constraint "leave_requests_reverses_request_id_unique"`). The route's `sendError` maps that non-AppError to a 500, not the 409 the architecture's error contract specifies: docs/ARCHITECTURE.md states "This feature adds one 409 case: cancelling an APPROVED request that already has a reversal row throws ConflictError (the release-exactly-once guard)", and the phase spec's integrationPoints name `findByReversesRequestId` as "the already-reversed lookup the … |

## Offending lines

- **src/modules/leave/leave.service.ts:297** — `review/architecture` (fixed in attempt 2)

  ```
      if (request.status === LeaveStatus.CANCELLED) {
  ```

- **scripts/smoke.js:395** — `review/test-reliability` (open)

  ```
          Math.max(Date.now(), curPeriod.start.getTime()) + 2 * dayMs,
  ```
