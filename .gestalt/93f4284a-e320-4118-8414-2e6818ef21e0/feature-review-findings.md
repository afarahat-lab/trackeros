# Feature review findings

Findings from the FEATURE-level review — one pass over everything this feature built, scoped to its diff against the default branch. Per-phase gate findings live in each phase's `.gestalt/<correlation id>/` folder.

**4 open · 0 fixed** after 1 attempt.

A finding is `fixed` when an attempt stopped reporting it. Findings are never removed from this file — one that lists only what is currently broken cannot show you that anything got better.

| status | rule | location | first seen | resolved | finding |
|---|---|---|---|---|---|
| 🔴 open | `review/documentation` | `docs/ARCHITECTURE.md:1731` | attempt 1 | — | [review/documentation] Reconciled business rule 7 states the queue visibility as "a MANAGER sees the SUBMITTED requests of their own direct reports (one level, not transitive) and not their own; an EMPLOYEE sees none". The built service does the opposite for the actor's own requests: `employeeIds = [actor.id]` for EMPLOYEE and `[actor.id, ...reports.map(...)]` for MANAGER (src/modules/leave/leave.service.ts:484-493), and the tests pin that scoping. docs/DOMAIN.md:64 already records this as a known divergence and names this exact rule as the stale copy, so the document is knowingly left contradicting the built behaviour it is the source of truth for.   Evidence: "7. Queue visibility reuses the module's existing role-scoped rule: an ADMIN sees every SUBMITTED request; a MANAGER sees the SUBMITTED requests of their own direct reports (one level, not transitive) and not their own; an EMPLOYEE sees none. Queue membership and decide authority are separate concerns — the existing decide … |
| 🔴 open | `review/documentation` | `docs/DOMAIN.md:96` | attempt 1 | — | [review/documentation] The `LeaveRequestQueryParams` table's last row and the following `## balance` heading were joined onto one line, so the `balance` section heading is no longer a heading and the table row is malformed. Verified with `cat -A`: the line is `\| offset \| number \| false \|## balance$` — the newline that separated the table from the heading is gone, and `## balance` no longer appears in the file's heading list (`grep -n "^## " docs/DOMAIN.md` returns base, leave, employee, policy, notification, audit, validation, system, uptime — no balance).   Evidence: "\| offset \| number \| false \|## balance" |
| 🔴 open | `review/consistency` | `src/modules/leave/leave.service.ts:636` | attempt 1 | — | [review/consistency] This actor-exclusion filter contradicts the stated invariant of the phase specs this feature was built against. Spec 1f61f624 (phase 3) constrains: "The notification set is a function of the STATE CHANGE, not of who performed it: exactly TWO notificationService.create calls for SUBMITTED and APPROVED cancellations, exactly ONE for DRAFT" and "Self-notification is not suppressed: when the cancelling actor is the resolved recipient, the notification is still written. The exactly-one rule holds regardless of actor identity." Spec 9244f013 (phase 6) repeats it: "no case may assert suppression on the basis of the actor being the recipient", and its success criterion #3 requires the DRAFT case to assert exactly one notification. With this filter, an owner cancelling their own SUBMITTED request emits ONE notification instead of two, and the DRAFT case now asserts zero (tests/unit/modules/leave/leave.service.test.ts:743, … |
| 🔴 open | `review/test-coverage` | `tests/unit/modules/leave/leave.service.test.ts:743` | attempt 1 | — | [review/test-coverage] This assertion inverts a pre-existing case rather than extending it additively. The phase-6 spec (9244f013) constrains "Additive extension only: every pre-existing test case ... must remain byte-for-byte in intent — no case deleted, renamed, skipped, or weakened", and its success criterion #3 requires "a DRAFT cancellation still produces EXACTLY ONE notification (requester only) — the pre-existing DRAFT assertion is unchanged and no approver notification is added on that path." The pre-existing DRAFT case previously asserted `toHaveLength(1)` with `recipientId === REQUESTER_ID`; it now asserts zero, and the sibling case at line 988 was renamed from "sends exactly one cancellation notification for the original" to "notifies only the requester when the canceller IS the recorded approver". Both changes are consistent with the owner amendment in docs/DECISIONS.md CLARIFY-006 (commit c2d19382), but they are the opposite of what these specs pin, so the specs and the … |

## Offending lines

- **src/modules/leave/leave.service.ts:636** — `review/consistency` (open)

  ```
        if (notice.recipientId === actor.id) {
  ```

- **tests/unit/modules/leave/leave.service.test.ts:743** — `review/test-coverage` (open)

  ```
        expect(notificationService.inputs).toHaveLength(0);
  ```

- **docs/ARCHITECTURE.md:1731** — `review/documentation` (open)

  ```
  7. Queue visibility reuses the module's existing role-scoped rule: an ADMIN sees every SUBMITTED request; a MANAGER sees the SUBMITTED requests of their own direct reports (one level, not transitive) and not their own; an EMPLOYEE sees none. Queue membership and decide authority are separate concerns — the existing decide guards remain the sole authority on whether a decision may be taken.
  ```

- **docs/DOMAIN.md:96** — `review/documentation` (open)

  ```
  | offset | number | false |## balance
  ```
