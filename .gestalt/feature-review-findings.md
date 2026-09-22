# Feature review findings

Findings from the FEATURE-level review — one pass over everything this feature built, scoped to its diff against the default branch. Per-phase gate findings live in each phase's `.gestalt/<correlation id>/` folder.

**0 open · 2 fixed** after 6 attempts.

A finding is `fixed` when an attempt stopped reporting it. Findings are never removed from this file — one that lists only what is currently broken cannot show you that anything got better.

| status | rule | location | first seen | resolved | finding |
|---|---|---|---|---|---|
| 🟢 fixed | `review/architecture` | `seeds/seed.service.ts:175` | attempt 1 | attempt 2 | [review/architecture] The seeded leave requests are dated relative to `employeeHireDate` (a fixed 2022-07-01 instant), while the seeded balances are derived for the CURRENT accrual period via `periodContaining(hireDate, policy.accrualPeriodMonths, now)` (line 243). Because `countersFor` (line 244) sums requests by (employeeId, leaveTypeCode) only — never by period — the APPROVED request dated 2022-07-05 contributes its 4 `requestedDays` to `used_days`, and the SUBMITTED request dated 2022-07-15 contributes 2 to `pending_days`, on a balance whose period is 2026-07-01→2027-07-01. Success criterion #4 requires `pending_days`/`used_days` to equal the sum of requests "for that (employee, leave type, period)"; there are zero SUBMITTED/APPROVED requests inside the current period, so the counters are inconsistent with the period they claim to represent (an APPROVED request from 2022 counting against a 2026–2027 balance).   Evidence: "  const approvedStart = addDays(employeeHireDate, 4);" |
| 🟢 fixed | `dependency-direction` | `web/src/presentation/pages/DashboardPage.tsx:55` | attempt 5 | attempt 6 | [dependency-direction] The binding domain rule states the loading condition must not be `employee === null \|\| balances === null` (which conflates the two independent fetches). The code still retains that exact nullability-based sub-expression in the loading condition, even though an explicit `loading` boolean was added. The functional bug is mitigated (error takes precedence and `loading` is set false in both paths), but the rule explicitly forbids deriving the loading state from data nullability, and the leftover `employee === null \|\| balances === null` remains.   Evidence: "if (loading \|\| employee === null \|\| balances === null) {" |

## Offending lines

- **seeds/seed.service.ts:175** — `review/architecture` (fixed in attempt 2)

  ```
    const approvedStart = addDays(employeeHireDate, 4);
  ```

- **web/src/presentation/pages/DashboardPage.tsx:55** — `dependency-direction` (fixed in attempt 6)

  ```
  if (loading || employee === null || balances === null) {
  ```
