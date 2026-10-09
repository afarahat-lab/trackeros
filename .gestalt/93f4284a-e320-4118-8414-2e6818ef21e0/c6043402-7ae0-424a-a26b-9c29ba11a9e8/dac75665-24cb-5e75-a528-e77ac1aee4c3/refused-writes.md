# Refused writes — awaiting a human decision

_Generated 2026-10-09 01:14:30Z · correlation `dac75665-24cb-5e75-a528-e77ac1aee4c3`._

2 write(s) were refused, 0 of them because the target is a GOVERNANCE file. A refusal is not a judgement that the change is wrong — it is the platform declining to let an agent edit the rules it is judged by. The proposed content is reproduced in full below so it can be applied by hand if it is right.

**To ratify one:** apply the content yourself and commit it, or record the decision as an ADR in `docs/DECISIONS.md`. **To reject one:** delete its section from this file. Leaving this file in place is not a decision — it is a queue.

## 1. `docs/ARCHITECTURE.md`

- **Proposed by:** context-agent
- **Refused because:** refusing a section-addressed write of docs/ARCHITECTURE.md: no section titled "Module boundaries". Read the file (readFile with section=…) to see its headings.

<details><summary>Proposed content (verbatim)</summary>

```
- `web/src/modules/approvals/` — IApprovalsService, ApprovalsService, index.ts. Methods as built: `getQueue()`, `getPendingDecisions()`, `decide(requestId, action)`. (`getQueue`/`decide` are the names in the code; the design's `listPending(profile)`/`approve(id)`/`reject(id)` were folded into them.)
- `web/src/presentation/guards/` — RequireApprover (MANAGER|ADMIN only, else redirect).
- `web/src/presentation/pages/` — ApprovalsPage (list, approve/reject, empty state, drill-in link), DashboardPage (role-gated approvals link).
- `web/src/presentation/App.tsx` — /approvals route wrapped in RequireAuth + RequireApprover.

Dependencies flow inward: presentation -> modules -> infrastructure. Approvals depends on leave, employee, shared-types. No circular edges.

**Pending-decisions read (Phase 7).** `ApprovalsService.getPendingDecisions()` delegates to `leaveService.listPendingDecisions()` and returns the array verbatim — the backend scopes visibility by role and orders by `start_date ASC`, so there is no client-side sort, filter, or SUBMITTED predicate. `ApprovalsPage` and the guards were NOT changed: they still consume `getQueue()`, so the new read is a service-surface addition with no presentation consumer yet.
```

</details>

## 2. `docs/ARCHITECTURE.md`

- **Proposed by:** context-agent
- **Refused because:** refusing a section-addressed write of docs/ARCHITECTURE.md: no section titled "Module boundaries". Read the file (readFile with section=…) to see its headings.

<details><summary>Proposed content (verbatim)</summary>

```
- `policy` owns `createPolicyService()` and exports it from `src/modules/policy/index.ts`. The factory constructs `PolicyService` with `PgLeavePolicyRepository` and `LeaveTypeService(PgLeaveTypeRepository)`.
- `balance` and `leave` no longer import from `../leave-type`; they import `createPolicyService` from `../policy`.
- `leave-type` remains unchanged and is depended on only by `policy`.
```

</details>
