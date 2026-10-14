# Refused writes — awaiting a human decision

_Generated 2026-10-14 03:21:28Z · correlation `f7bf1bbb-9134-4eb3-b621-c08784739925`._

2 write(s) were refused, 0 of them because the target is a GOVERNANCE file. A refusal is not a judgement that the change is wrong — it is the platform declining to let an agent edit the rules it is judged by. The proposed content is reproduced in full below so it can be applied by hand if it is right.

**To ratify one:** apply the content yourself and commit it, or record the decision as an ADR in `docs/DECISIONS.md`. **To reject one:** delete its section from this file. Leaving this file in place is not a decision — it is a queue.

## 1. `docs/ARCHITECTURE.md`

- **Proposed by:** context-agent
- **Refused because:** refusing a section-addressed write of docs/ARCHITECTURE.md: no section titled "Documentation repair: `## balance` heading restored in docs/DOMAIN.md". Read the file (readFile with section=…) to see its headings.

<details><summary>Proposed content (verbatim)</summary>

```
A documentation-only repair. The single committed change is in `docs/DOMAIN.md`; no file under `src/`, `web/`, `tests/`, `migrations/`, `seeds/`, or `scripts/` was touched, no source/test/migration/config file was added or deleted, and no tooling, dependency, lint rule, or CI job was introduced.

**The defect.** The `leave` section's `LeaveRequestQueryParams` table ended with its final row glued to the next top-level heading: the line read `| offset | number | false |## balance`. The `## balance` heading therefore never began its own line, so the document parsed with `balance` as literal text inside a table row rather than as a top-level module section — a silent defect (no parse error), which is why it was caught by a structural review finding rather than by any tooling.

**The repair (code as built).** The line break was restored: the table's last row `| offset | number | false |` now terminates its own line, followed by a blank line, then `## balance` at column 0. This is exactly the canonical fix the docs-only CI path documents (`.github/workflows/gestalt-fix-ci.yml`: "`## balance` moved back onto its own line"), and the touched path stays under `docs/**`, which is the path set that workflow triggers on.

**What did NOT change.** The edit is whitespace/newline-only. The `LeaveRequestQueryParams` table keeps all eight data rows byte-for-byte; the `balance` section's body is unchanged and now sits under the restored heading (blank line, description paragraph, then the `### Balance` and `### LeaveBalance` subsections in their original order); the `leave` section still ends at the `LeaveRequestQueryParams` table and does not absorb the balance content. `balance` is a sibling of `leave`, terminated only by the next `##` heading, matching the heading form and blank-line separation of `leave`, `employee`, `policy`, `notification`, `audit`, and `validation`. The repair is idempotent — re-applying it to the already-correct file is a no-op.

**Recorded drift left in place (deliberate).** The known entity-shape drift in `docs/DOMAIN.md` — the stale `LeaveRequest.leaveTypeId` / `approvedBy` / `approvedAt` fields, `EmploymentStatus.INACTIVE`, and the `audit` section's `oldValues` / `newValues` / `performedBy` / `performedAt` shapes — is unchanged. This phase repaired formatting only; the drift remains known and uncorrected, exactly as recorded elsewhere in this document. The other open finding from the same review (`review/stale-spec`, the recipient-resolution placement wording) is a separate finding with its own fix and was not addressed here.

```

</details>

## 2. `docs/ARCHITECTURE.md`

- **Proposed by:** context-agent
- **Refused because:** refusing a section-addressed write of docs/ARCHITECTURE.md: no section titled "Documentation repair: balance heading restored in docs/DOMAIN.md". Read the file (readFile with section=…) to see its headings.

<details><summary>Proposed content (verbatim)</summary>

```
A documentation-only repair. The single committed change is in `docs/DOMAIN.md`; no file under `src/`, `web/`, `tests/`, `migrations/`, `seeds/`, or `scripts/` was touched, no source/test/migration/config file was added or deleted, and no tooling, dependency, lint rule, or CI job was introduced.

**The defect.** The `leave` section's `LeaveRequestQueryParams` table ended with its final row glued to the next top-level heading: the line read `| offset | number | false |## balance`. The `balance` heading therefore never began its own line, so the document parsed with `balance` as literal text inside a table row rather than as a top-level module section — a silent defect (no parse error), which is why it was caught by a structural review finding rather than by any tooling.

**The repair (code as built).** The line break was restored: the table's last row `| offset | number | false |` now terminates its own line, followed by a blank line, then the `balance` heading at column 0. This is exactly the canonical fix the docs-only CI path documents (`.github/workflows/gestalt-fix-ci.yml`: the heading "moved back onto its own line"), and the touched path stays under `docs/**`, which is the path set that workflow triggers on.

**What did NOT change.** The edit is whitespace/newline-only. The `LeaveRequestQueryParams` table keeps all eight data rows byte-for-byte; the `balance` section's body is unchanged and now sits under the restored heading (blank line, description paragraph, then the `Balance` and `LeaveBalance` subsections in their original order); the `leave` section still ends at the `LeaveRequestQueryParams` table and does not absorb the balance content. `balance` is a sibling of `leave`, terminated only by the next top-level heading, matching the heading form and blank-line separation of `leave`, `employee`, `policy`, `notification`, `audit`, and `validation`. The repair is idempotent — re-applying it to the already-correct file is a no-op.

**Recorded drift left in place (deliberate).** The known entity-shape drift in `docs/DOMAIN.md` — the stale `LeaveRequest.leaveTypeId` / `approvedBy` / `approvedAt` fields, `EmploymentStatus.INACTIVE`, and the `audit` section's `oldValues` / `newValues` / `performedBy` / `performedAt` shapes — is unchanged. This phase repaired formatting only; the drift remains known and uncorrected, exactly as recorded elsewhere in this document. The other open finding from the same review (the recipient-resolution placement wording) is a separate finding with its own fix and was not addressed here.

```

</details>
