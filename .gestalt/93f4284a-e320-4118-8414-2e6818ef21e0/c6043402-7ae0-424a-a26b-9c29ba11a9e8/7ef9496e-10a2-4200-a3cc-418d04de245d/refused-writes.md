# Refused writes — awaiting a human decision

_Generated 2026-10-15 08:08:19Z · correlation `7ef9496e-10a2-4200-a3cc-418d04de245d`._

1 write(s) were refused, 0 of them because the target is a GOVERNANCE file. A refusal is not a judgement that the change is wrong — it is the platform declining to let an agent edit the rules it is judged by. The proposed content is reproduced in full below so it can be applied by hand if it is right.

**To ratify one:** apply the content yourself and commit it, or record the decision as an ADR in `docs/DECISIONS.md`. **To reject one:** delete its section from this file. Leaving this file in place is not a decision — it is a queue.

## 1. `docs/ARCHITECTURE.md`

- **Proposed by:** context-agent
- **Refused because:** refusing a section-addressed write of docs/ARCHITECTURE.md: no section titled "Open questions". Read the file (readFile with section=…) to see its headings.

<details><summary>Proposed content (verbatim)</summary>

```
See the reconciled `openQuestions` list: null `managerId` on a SUBMITTED cancellation; null `approverId` on a legacy APPROVED row; whether the approver notification accompanies or replaces the existing requester notification; confirmation of the `related_entity_code` schema decision; queue membership (SUBMITTED-only vs SUBMITTED+APPROVED); ADMIN queue scope; the reversal path's notification keying; and the documented-vs-built `(related_entity_type, related_entity_id)` index drift.

**Resolved since this list was written:** self-notification suppression is no longer open — CLARIFY-006 (amended 2026-10-09) settled it as "notify every recipient EXCEPT the actor who performed the cancellation", and the *Business rules (reconciled)* list above (rules 5, 8, 9, 10, 13) now states the built behaviour. The remaining items above are unchanged.
```

</details>
