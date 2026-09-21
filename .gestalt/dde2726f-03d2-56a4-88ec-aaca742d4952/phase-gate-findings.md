# Phase 5 — gate findings

Findings from the PER-PHASE gate, scoped to this phase's diff. Subjective code review runs once per feature (`.gestalt/feature-review-findings.md`), not here.

**1 open · 0 fixed** after 1 attempt.

A finding is `fixed` when an attempt stopped reporting it. Findings are never removed from this file — one that lists only what is currently broken cannot show you that anything got better.

| status | rule | location | first seen | resolved | finding |
|---|---|---|---|---|---|
| 🔴 open | `success-criteria-1` | `web/src/presentation/pages/LeaveListPage.tsx:44` | attempt 1 | — | [success-criteria-1] The "Request leave" link is placed only inside the final return, which is reached only when `error === null` AND `requests !== null`. The error state (`return <div role="alert">{error}</div>`) and loading state (`return <div>Loading…</div>`) return early before this line, so the link is not reachable in those render states. Success criterion #1 requires the link to be reachable in every render state — error, loading, empty list, and populated list — not only inside the populated-list branch.   Evidence: "<Link to="/leaves/new">Request leave</Link>" |

## Offending lines

- **web/src/presentation/pages/LeaveListPage.tsx:44** — `success-criteria-1` (open)

  ```
  <Link to="/leaves/new">Request leave</Link>
  ```
