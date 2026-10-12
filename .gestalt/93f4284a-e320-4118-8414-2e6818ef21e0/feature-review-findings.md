# Feature review findings

Findings from the FEATURE-level review — one pass over everything this feature built, scoped to its diff against the default branch. Per-phase gate findings live in each phase's `.gestalt/<correlation id>/` folder.

**2 open · 3 fixed · 2 superseded** after 4 attempts.

A finding is `fixed` when it stopped being reported AND its file changed — something was done about it. It is `superseded` when it stopped being reported and its file did NOT change: the rule that produced it changed, not the code. Findings are never removed from this file — one that lists only what is currently broken cannot show you that anything got better, and one that calls both of those "fixed" cannot show you which.

| status | rule | location | first seen | resolved | finding |
|---|---|---|---|---|---|
| 🔴 open | `review/review/stale-spec` | `docs/ARCHITECTURE.md:1668` | attempt 4 | — | [review/review/stale-spec] Stale schema claim contradicting a recorded decision. `docs/DECISIONS.md` ADR-002 (Accepted) records: "Adding `leave_requests` `status` / `approver_id` indexes in the same migration: the existing `(employee_id, status)` index already serves the pending-decisions predicate, and `approver_id` needs no index for that query" — rejected. CLARIFY-005 likewise states "`approver_id` needs no index for this query". This line still asserts "New indexes: standalone `status` ... and `approver_id`" and that the queue query "MUST also exclude `reverses_request_id IS NOT NULL`", neither of which the delivered migration or repository does.   Evidence: "- **`leave_requests`** (UNCHANGED, referenced by name) — already carries `status`, `approver_id`, `cancelled_by`, `cancelled_at`, `reverses_request_id`. New indexes: standalone `status` (the existing `(employee_id, status)` cannot serve a status-only predicate — this is the first status-only access path in the codebase) and … |
| 🔴 open | `review/documentation` | `docs/DOMAIN.md:96` | attempt 1 | — | [review/documentation] This PR's edit to `docs/DOMAIN.md` collapsed the `## balance` heading onto the last row of the `LeaveRequestQueryParams` table, so the heading is no longer a heading and the `balance` section is no longer addressable (heading-based section lookup and any heading index will not find it). The diff replaces `\| offset \| number \| false \|` + blank line + `## balance` with this single merged line.   Evidence: "\| offset \| number \| false \|## balance"   Fix: Restore the line break: `\| offset \| number \| false \|`, then a blank line, then `## balance`. |
| 🔵 superseded | `review/architecture` | `agents.yaml:961` | attempt 3 | attempt 4 | [review/architecture] This branch's `agents.yaml` reverts the consult completion cap that `origin/main` established. Verified with `git show origin/main:agents.yaml`: main sets `max_tokens: 32000` for all five consultable agents (domain-architect-agent, data-architect-agent, app-architect-agent, chief-architect-agent, planner-agent), with the rationale recorded in main's own comments ("1.11x HEADROOM IS NOT HEADROOM … 32,000 is 1.48x the pooled maximum"; "`data-architect-agent` was TRUNCATING at 0.66x"). On this branch those five are 6000 / 6000 / 6000 / 12000 / 24000 — i.e. the branch reintroduces the exact cap main documented as truncating. Because the merge is a squash, merging this branch silently undoes that decision. The same class of staleness applies to `review-agent`'s `token_budget: 1600000` (main: 1200000) and to `docs/DECISIONS.md`, where main's "🔴 RESTORED 2026-10-11" provenance note for CLARIFY-001..008 is absent on this branch.   Evidence: "      max_tokens: 6000" … |
| 🟢 fixed | `review/configuration` | `agents.yaml:979` | attempt 2 | attempt 3 | [review/configuration] This branch's `agents.yaml` drops the consult completion caps that `origin/main` carries, and removes the rationale that derived them. On main all five consultable agents are `max_tokens: 32000`; here `domain-architect-agent` (952), `data-architect-agent` (979) and `app-architect-agent` (1009) are 6000, `chief-architect-agent` is 12000 and `planner-agent` is 24000. The deleted comment block recorded the measured basis for 32000 — "Per-agent observed maxima before this change (cap -> observed max completion, n): ... data-architect-agent 6,000 -> 9,100 n=12" and "1.11x HEADROOM IS NOT HEADROOM ... with no retry a cut-off consult is a FAILED consult, not a slower one". At 6000 the data-architect-agent cap sits below its own observed maximum (9,100), i.e. it truncates. The diff against `origin/main` for this file is 162 lines removed, 0 added apart from the `max_iterations` comment.   Evidence: "      max_tokens: 6000"   Fix: Restore `max_tokens: 32000` for … |
| 🔵 superseded | `review/documentation` | `docs/ARCHITECTURE.md:1684` | attempt 1 | attempt 4 | [review/documentation] rule_id: review/stale-spec. This line states a repository contract the recorded decision explicitly rejects, and its stated rationale is factually wrong. ADR-004 in `docs/DECISIONS.md` records: "the repository applies only the `employeeIds` filter and the `status = 'SUBMITTED'` predicate", and lists as a REJECTED alternative "Passing `actorId`/`actorRole` into the repository and re-expressing the role-scoped visibility rule in SQL". The built repository matches the decision — `src/modules/leave/leave.repository.ts` declares `findPendingDecisions(employeeIds?: string[], client?: PoolClient)` and builds `conditions: string[] = [\`status = '${LeaveStatus.SUBMITTED}'\`]` with no `reverses_request_id` predicate. The doc's claim that "without that predicate the reversal row is a spurious second queue entry" is also incorrect: the reversal row is inserted with `status: LeaveStatus.CANCELLED` (`src/modules/leave/leave.service.ts`), so the SUBMITTED predicate already … |
| 🟢 fixed | `review/consistency` | `src/modules/leave/leave.service.ts:636` | attempt 1 | attempt 2 | [review/consistency] This actor-exclusion filter contradicts the stated invariant of the phase specs this feature was built against. Spec 1f61f624 (phase 3) constrains: "The notification set is a function of the STATE CHANGE, not of who performed it: exactly TWO notificationService.create calls for SUBMITTED and APPROVED cancellations, exactly ONE for DRAFT" and "Self-notification is not suppressed: when the cancelling actor is the resolved recipient, the notification is still written. The exactly-one rule holds regardless of actor identity." Spec 9244f013 (phase 6) repeats it: "no case may assert suppression on the basis of the actor being the recipient", and its success criterion #3 requires the DRAFT case to assert exactly one notification. With this filter, an owner cancelling their own SUBMITTED request emits ONE notification instead of two, and the DRAFT case now asserts zero (tests/unit/modules/leave/leave.service.test.ts:743, … |
| 🟢 fixed | `review/test-coverage` | `tests/unit/modules/leave/leave.service.test.ts:743` | attempt 1 | attempt 2 | [review/test-coverage] This assertion inverts a pre-existing case rather than extending it additively. The phase-6 spec (9244f013) constrains "Additive extension only: every pre-existing test case ... must remain byte-for-byte in intent — no case deleted, renamed, skipped, or weakened", and its success criterion #3 requires "a DRAFT cancellation still produces EXACTLY ONE notification (requester only) — the pre-existing DRAFT assertion is unchanged and no approver notification is added on that path." The pre-existing DRAFT case previously asserted `toHaveLength(1)` with `recipientId === REQUESTER_ID`; it now asserts zero, and the sibling case at line 988 was renamed from "sends exactly one cancellation notification for the original" to "notifies only the requester when the canceller IS the recorded approver". Both changes are consistent with the owner amendment in docs/DECISIONS.md CLARIFY-006 (commit c2d19382), but they are the opposite of what these specs pin, so the specs and the … |

## Offending lines

- **src/modules/leave/leave.service.ts:636** — `review/consistency` (fixed at attempt 2)

  ```
        if (notice.recipientId === actor.id) {
  ```

- **tests/unit/modules/leave/leave.service.test.ts:743** — `review/test-coverage` (fixed at attempt 2)

  ```
        expect(notificationService.inputs).toHaveLength(0);
  ```

- **docs/ARCHITECTURE.md:1684** — `review/documentation` (superseded at attempt 4)

  ```
  - `ILeaveRepository.findPendingDecisions(actorId: string, actorRole: EmployeeRole, client?: PoolClient): Promise<LeaveRequest[]>` — NEW. Returns the requests still awaiting this actor's decision: `status = SUBMITTED` AND `reverses_request_id IS NULL`, scoped by role (ADMIN: all; MANAGER: the requester's `employees.manager_id = actorId`; EMPLOYEE: none). `ORDER BY start_date ASC, id ASC`. Read-only: no `forUpdate`, no transaction, returns an array (possibly empty), never null. `CANCELLED` is excluded by construction, which is what makes a cancelled request stop being listed.
  ```

- **docs/DOMAIN.md:96** — `review/documentation` (open)

  ```
  | offset | number | false |## balance
  ```

- **agents.yaml:979** — `review/configuration` (fixed at attempt 3)

  ```
        max_tokens: 6000
  ```

- **agents.yaml:961** — `review/architecture` (superseded at attempt 4)

  ```
        max_tokens: 6000
  ```

- **docs/ARCHITECTURE.md:1668** — `review/review/stale-spec` (open)

  ```
  - **`leave_requests`** (UNCHANGED, referenced by name) — already carries `status`, `approver_id`, `cancelled_by`, `cancelled_at`, `reverses_request_id`. New indexes: standalone `status` (the existing `(employee_id, status)` cannot serve a status-only predicate — this is the first status-only access path in the codebase) and `approver_id` (recipient resolution for a cancelled APPROVED request). The queue query MUST also exclude `reverses_request_id IS NOT NULL`: a cancelled-after-approval request is TWO rows, so without that predicate the reversal row is a spurious second queue entry. **NOT delivered as of Phase 1** — the delivered migration adds no `leave_requests` DDL at all; see *Phase 1 delivered* below.
  ```
