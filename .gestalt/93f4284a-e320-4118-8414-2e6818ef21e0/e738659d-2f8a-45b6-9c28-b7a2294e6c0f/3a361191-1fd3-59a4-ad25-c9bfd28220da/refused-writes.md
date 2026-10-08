# Refused writes — awaiting a human decision

_Generated 2026-10-08 22:50:32Z · correlation `3a361191-1fd3-59a4-ad25-c9bfd28220da`._

1 write(s) were refused, 0 of them because the target is a GOVERNANCE file. A refusal is not a judgement that the change is wrong — it is the platform declining to let an agent edit the rules it is judged by. The proposed content is reproduced in full below so it can be applied by hand if it is right.

**To ratify one:** apply the content yourself and commit it, or record the decision as an ADR in `docs/DECISIONS.md`. **To reject one:** delete its section from this file. Leaving this file in place is not a decision — it is a queue.

## 1. `docs/ARCHITECTURE.md`

- **Proposed by:** context-agent
- **Refused because:** refusing a section-addressed write of docs/ARCHITECTURE.md: no section titled "Recommended phases". Read the file (readFile with section=…) to see its headings.

<details><summary>Proposed content (verbatim)</summary>

```
1. Migration: `notifications.related_entity_code` + `leave_requests` status/approver_id indexes (1 file). — DELIVERED, except the `leave_requests` indexes, which were deliberately not added (see *Phase 1 delivered*).
2. Repositories: `findPendingDecisions` + `related_entity_code` plumbing (2 files). — DELIVERED (built signature differs from the design; see *Phase 1 delivered*).
3. `LeaveService.cancel`: notify the approver inside the existing unit of work (1 file). — DELIVERED (ADR-003).
4. `LeaveService.listPendingDecisions` (1 file). — DELIVERED.
5. `GET /leaves/pending-decisions` route (1 file). — DELIVERED (see *Phase 5 delivered*).
6. Tests: approver notification + pending-decisions read (2 files). — NOT DELIVERED.
7. (optional) Web approvals queue consumes the new endpoint (2 files). — NOT DELIVERED.
```

</details>
