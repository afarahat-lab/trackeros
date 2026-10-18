# Refused writes — awaiting a human decision

_Generated 2026-10-18 12:33:53Z · correlation `22a2708e-1e2a-4049-8aa5-35a53bf23a0e`._

3 write(s) were refused, 0 of them because the target is a GOVERNANCE file. A refusal is not a judgement that the change is wrong — it is the platform declining to let an agent edit the rules it is judged by. The proposed content is reproduced in full below so it can be applied by hand if it is right.

**To ratify one:** apply the content yourself and commit it, or record the decision as an ADR in `docs/DECISIONS.md`. **To reject one:** delete its section from this file. Leaving this file in place is not a decision — it is a queue.

## 1. `docs/ARCHITECTURE.md`

- **Proposed by:** context-agent
- **Refused because:** refusing a section-addressed write of docs/ARCHITECTURE.md: no section titled "Documentation note (rule 2 correction and Phase 7 de-duplication)". Read the file (readFile with section=…) to see its headings.

<details><summary>Proposed content (verbatim)</summary>

```
A later documentation-only repair phase corrected two defects in THIS feature section. The phase's entire diff is `docs/ARCHITECTURE.md`: no file under `src/`, `web/`, `tests/`, `migrations/`, `seeds/`, or `scripts/` was touched, no new file was created, and no test was added, changed, or re-run. The built code is the source of truth for both edits — neither `src/modules/leave/leave.service.ts` nor `tests/unit/modules/leave/leave.service.test.ts` was adjusted to match the prose.

- **Business rule 2 was stale and is corrected.** It previously asserted an unconditional "exactly one approver notification per cancellation". The built behaviour is conditional: `LeaveService.cancellationRecipients` builds the recipient set once (requester + the resolved approver of rule 1), drops any notice whose `recipientId === actor.id`, then collapses duplicates by recipient id — so when the cancelling actor IS the resolved approver, ZERO approver notifications are written. Rule 2 now reads "at most one", states that emission condition, and cites the same authority the rest of the section cites: CLARIFY-006 in `docs/DECISIONS.md`, amended 2026-10-09 ("Every recipient is notified EXCEPT the actor who performed the cancellation"). No new decision, ADR, or CLARIFY number was introduced. The rule's still-true clauses were kept verbatim: the notification is not duplicated per approver candidate, not sent to both the recorded approver and the current manager, and not re-sent on a retry. The correction is consistent with rule 5 (recipient set, at most two, may be empty), rule 9 (self-notification suppressed), the *Lifecycle states* named transitions (`cancelInPlace` / `reverseApproved` both "emit the approver notification" — the emission path, not the recipient count), and the *Transaction* contract's step (d). The pinned test `notifies only the requester when the manager who approved it cancels it` (`tests/unit/modules/leave/leave.service.test.ts`) asserts exactly one notification with `recipientId === REQUESTER_ID`, which is the behaviour rule 2 now describes.
- **A duplicated delivery record was removed.** The heading `### Phase 7 delivered (web approvals queue consumes GET /leaves/pending-decisions)` appeared TWICE with byte-identical bodies (immediately after *Phase 1 delivered* and again immediately before *Open questions*). One copy was deleted and the other kept verbatim — pure de-duplication, no content rewritten, merged, or reworded. Each `### Phase N delivered (...)` heading in this file now appears exactly once, so a reader resolving that heading gets one authoritative block.

**Deliberately left unchanged by this repair** (each is a separate change, not a defect of this phase): the stale `web-approvals -> web-infrastructure-api` line in this section's *Dependency map*, which the *Phase 7 delivered* block's "Stale text left in place" bullet documents on purpose; the other documented-vs-built drifts in this section (the `leave_requests` `status` / `approver_id` indexes and the `reverses_request_id IS NOT NULL` queue predicate described in *Conceptual tables* and *Repository interfaces* but not built); and the *Open questions* list, including the now-settled self-notification-suppression item.

```

</details>

## 2. `docs/ARCHITECTURE.md`

- **Proposed by:** context-agent
- **Refused because:** refusing a section-addressed write of docs/ARCHITECTURE.md: no section titled "Documentation note (rule 2 correction and Phase 7 de-duplication)". Read the file (readFile with section=…) to see its headings.

<details><summary>Proposed content (verbatim)</summary>

```
A later documentation-only repair phase corrected two defects in THIS feature section. The phase's entire diff is `docs/ARCHITECTURE.md`: no file under `src/`, `web/`, `tests/`, `migrations/`, `seeds/`, or `scripts/` was touched, no new file was created, and no test was added, changed, or re-run. The built code is the source of truth for both edits — neither `src/modules/leave/leave.service.ts` nor `tests/unit/modules/leave/leave.service.test.ts` was adjusted to match the prose.

- **Business rule 2 was stale and is corrected.** It previously asserted an unconditional "exactly one approver notification per cancellation". The built behaviour is conditional: `LeaveService.cancellationRecipients` builds the recipient set once (requester + the resolved approver of rule 1), drops any notice whose `recipientId === actor.id`, then collapses duplicates by recipient id — so when the cancelling actor IS the resolved approver, ZERO approver notifications are written. Rule 2 now reads "at most one", states that emission condition, and cites the same authority the rest of the section cites: CLARIFY-006 in `docs/DECISIONS.md`, amended 2026-10-09 ("Every recipient is notified EXCEPT the actor who performed the cancellation"). No new decision, ADR, or CLARIFY number was introduced. The rule's still-true clauses were kept verbatim: the notification is not duplicated per approver candidate, not sent to both the recorded approver and the current manager, and not re-sent on a retry. The correction is consistent with rule 5 (recipient set, at most two, may be empty), rule 9 (self-notification suppressed), the *Lifecycle states* named transitions (`cancelInPlace` / `reverseApproved` both "emit the approver notification" — the emission path, not the recipient count), and the *Transaction* contract's step (d). The pinned test `notifies only the requester when the manager who approved it cancels it` (`tests/unit/modules/leave/leave.service.test.ts`) asserts exactly one notification with `recipientId === REQUESTER_ID`, which is the behaviour rule 2 now describes.
- **A duplicated delivery record was removed.** The heading `### Phase 7 delivered (web approvals queue consumes GET /leaves/pending-decisions)` appeared TWICE with byte-identical bodies (immediately after *Phase 1 delivered* and again immediately before *Open questions*). One copy was deleted and the other kept verbatim — pure de-duplication, no content rewritten, merged, or reworded. Each `### Phase N delivered (...)` heading in this file now appears exactly once, so a reader resolving that heading gets one authoritative block.

**Deliberately left unchanged by this repair** (each is a separate change, not a defect of this phase): the stale `web-approvals -> web-infrastructure-api` line in this section's *Dependency map*, which the *Phase 7 delivered* block's "Stale text left in place" bullet documents on purpose; the other documented-vs-built drifts in this section (the `leave_requests` `status` / `approver_id` indexes and the `reverses_request_id IS NOT NULL` queue predicate described in *Conceptual tables* and *Repository interfaces* but not built); and the *Open questions* list, including the now-settled self-notification-suppression item.

```

</details>

## 3. `docs/ARCHITECTURE.md`

- **Proposed by:** context-agent
- **Refused because:** refusing a section-addressed write of docs/ARCHITECTURE.md: no section titled "Documentation note (rule 2 correction and Phase 7 de-duplication)". Read the file (readFile with section=…) to see its headings.

<details><summary>Proposed content (verbatim)</summary>

```
The documentation-only repair phase that corrected business rule 2 and removed the duplicated *Phase 7 delivered* block is recorded in full under *Phase 7 delivered (web approvals queue consumes GET /leaves/pending-decisions)* below — see its closing "Later documentation-only repair phase" paragraph. No separate record is kept here.

```

</details>
