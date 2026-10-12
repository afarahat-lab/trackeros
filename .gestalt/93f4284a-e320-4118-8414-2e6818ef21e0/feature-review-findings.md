# Feature review findings

Findings from the FEATURE-level review — one pass over everything this feature built, scoped to its diff against the default branch. Per-phase gate findings live in each phase's `.gestalt/<correlation id>/` folder.

**3 open · 2 fixed** after 2 attempts.

A finding is `fixed` when an attempt stopped reporting it. Findings are never removed from this file — one that lists only what is currently broken cannot show you that anything got better.

| status | rule | location | first seen | resolved | finding |
|---|---|---|---|---|---|
| 🔴 open | `review/configuration` | `agents.yaml:979` | attempt 2 | — | [review/configuration] This branch's `agents.yaml` drops the consult completion caps that `origin/main` carries, and removes the rationale that derived them. On main all five consultable agents are `max_tokens: 32000`; here `domain-architect-agent` (952), `data-architect-agent` (979) and `app-architect-agent` (1009) are 6000, `chief-architect-agent` is 12000 and `planner-agent` is 24000. The deleted comment block recorded the measured basis for 32000 — "Per-agent observed maxima before this change (cap -> observed max completion, n): ... data-architect-agent 6,000 -> 9,100 n=12" and "1.11x HEADROOM IS NOT HEADROOM ... with no retry a cut-off consult is a FAILED consult, not a slower one". At 6000 the data-architect-agent cap sits below its own observed maximum (9,100), i.e. it truncates. The diff against `origin/main` for this file is 162 lines removed, 0 added apart from the `max_iterations` comment.   Evidence: "      max_tokens: 6000"   Fix: Restore `max_tokens: 32000` for … |
| 🔴 open | `review/documentation` | `docs/ARCHITECTURE.md:1729` | attempt 1 | — | [review/documentation] review/stale-spec — the unconditional "two `Notification` rows" count is superseded by the recorded decision CLARIFY-006 (docs/DECISIONS.md) and by the built code. `LeaveService.cancellationRecipients` filters the actor out of the recipient set, so the overwhelmingly common case — the requester cancelling their own SUBMITTED request — writes ONE row, not two, and a cancellation whose only recipients are the actor writes none. The document states a count the implementation deliberately does not produce.   Evidence: "5. A cancellation writes exactly one CANCEL `AuditLog` entry and, for a SUBMITTED or APPROVED cancellation, two `Notification` rows: one to the requester (existing behaviour, unchanged) and one to the approver (new). The approver notification is ADDITIONAL — it does not replace, merge with, or alter the requester notification, and it does not alter the audit entry (same action CANCEL, same entityType `'leave_request'`, same entityId = the ORIGINAL … |
| 🔴 open | `review/documentation` | `docs/DOMAIN.md:96` | attempt 1 | — | [review/documentation] The `LeaveRequestQueryParams` table's last row and the following `## balance` heading were joined onto one line, so the `balance` section heading is no longer a heading and the table row is malformed. Verified: `grep -n "^## " docs/DOMAIN.md` returns base, leave, employee, policy, notification, audit, validation, system, uptime — no `balance` — and the raw line is `\| offset \| number \| false \|## balance`. The `balance` domain section is therefore no longer addressable as a section in the document that is the source of truth for the domain model.   Evidence: "\| offset \| number \| false \|## balance"   Fix: Insert a newline between the table row and the heading so the line reads `\| offset \| number \| false \|` followed by a blank line and `## balance`. |
| 🟢 fixed | `review/consistency` | `src/modules/leave/leave.service.ts:636` | attempt 1 | attempt 2 | [review/consistency] This actor-exclusion filter contradicts the stated invariant of the phase specs this feature was built against. Spec 1f61f624 (phase 3) constrains: "The notification set is a function of the STATE CHANGE, not of who performed it: exactly TWO notificationService.create calls for SUBMITTED and APPROVED cancellations, exactly ONE for DRAFT" and "Self-notification is not suppressed: when the cancelling actor is the resolved recipient, the notification is still written. The exactly-one rule holds regardless of actor identity." Spec 9244f013 (phase 6) repeats it: "no case may assert suppression on the basis of the actor being the recipient", and its success criterion #3 requires the DRAFT case to assert exactly one notification. With this filter, an owner cancelling their own SUBMITTED request emits ONE notification instead of two, and the DRAFT case now asserts zero (tests/unit/modules/leave/leave.service.test.ts:743, … |
| 🟢 fixed | `review/test-coverage` | `tests/unit/modules/leave/leave.service.test.ts:743` | attempt 1 | attempt 2 | [review/test-coverage] This assertion inverts a pre-existing case rather than extending it additively. The phase-6 spec (9244f013) constrains "Additive extension only: every pre-existing test case ... must remain byte-for-byte in intent — no case deleted, renamed, skipped, or weakened", and its success criterion #3 requires "a DRAFT cancellation still produces EXACTLY ONE notification (requester only) — the pre-existing DRAFT assertion is unchanged and no approver notification is added on that path." The pre-existing DRAFT case previously asserted `toHaveLength(1)` with `recipientId === REQUESTER_ID`; it now asserts zero, and the sibling case at line 988 was renamed from "sends exactly one cancellation notification for the original" to "notifies only the requester when the canceller IS the recorded approver". Both changes are consistent with the owner amendment in docs/DECISIONS.md CLARIFY-006 (commit c2d19382), but they are the opposite of what these specs pin, so the specs and the … |

## Offending lines

- **src/modules/leave/leave.service.ts:636** — `review/consistency` (fixed in attempt 2)

  ```
        if (notice.recipientId === actor.id) {
  ```

- **tests/unit/modules/leave/leave.service.test.ts:743** — `review/test-coverage` (fixed in attempt 2)

  ```
        expect(notificationService.inputs).toHaveLength(0);
  ```

- **docs/ARCHITECTURE.md:1729** — `review/documentation` (open)

  ```
  5. A cancellation writes exactly one CANCEL `AuditLog` entry and, for a SUBMITTED or APPROVED cancellation, two `Notification` rows: one to the requester (existing behaviour, unchanged) and one to the approver (new). The approver notification is ADDITIONAL — it does not replace, merge with, or alter the requester notification, and it does not alter the audit entry (same action CANCEL, same entityType `'leave_request'`, same entityId = the ORIGINAL request id, same before/after state).
  ```

- **docs/DOMAIN.md:96** — `review/documentation` (open)

  ```
  | offset | number | false |## balance
  ```

- **agents.yaml:979** — `review/configuration` (open)

  ```
        max_tokens: 6000
  ```
