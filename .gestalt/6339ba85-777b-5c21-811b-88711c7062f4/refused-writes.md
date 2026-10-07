# Refused writes — awaiting a human decision

_Generated 2026-10-07 08:50:03Z · correlation `6339ba85-777b-5c21-811b-88711c7062f4`._

2 write(s) were refused, 0 of them because the target is a GOVERNANCE file. A refusal is not a judgement that the change is wrong — it is the platform declining to let an agent edit the rules it is judged by. The proposed content is reproduced in full below so it can be applied by hand if it is right.

**To ratify one:** apply the content yourself and commit it, or record the decision as an ADR in `docs/DECISIONS.md`. **To reject one:** delete its section from this file. Leaving this file in place is not a decision — it is a queue.

## 1. `docs/ARCHITECTURE.md`

- **Proposed by:** context-agent
- **Refused because:** refusing a section-addressed write of docs/ARCHITECTURE.md: no section titled "Recommended phases". Read the file (readFile with section=…) to see its headings.

<details><summary>Proposed content (verbatim)</summary>

```
1. **Phase 1 — audit entity query (`findByEntity` / `getByEntity`)** (4 files). Innermost dependency; unit-testable in isolation with an in-memory fake repository. No route, no leave change, no new module, no shared-types change. **DELIVERED** (see above).
2. **Phase 2 — `LeaveService.getHistory`** (1 file). Depends on Phase 1. Visibility via the existing `getById`; read-only; no `EmployeeRole` branch. **DELIVERED** (see above).
3. **Phase 3 — `GET /leaves/:id/history` route** (1 file). Depends on Phase 2. Reuses `resolveActor` and `sendError`; no role guard; invisible and nonexistent ids produce byte-identical 404s. **DELIVERED** (see above).
4. **Phase 4 — tests** (2 files). Depends on Phases 1–3: entity-query ordering; the request's own employee; a MANAGER reading a direct report's history; a requester who may not see the request getting 404; the empty-history case. **DELIVERED** (see above) — one new file under `tests/unit/modules/audit/` plus an additive extension of `tests/unit/modules/leave/leave.routes.test.ts`; no `src/` change.
```

</details>

## 2. `docs/ARCHITECTURE.md`

- **Proposed by:** context-agent
- **Refused because:** refusing a section-addressed write of docs/ARCHITECTURE.md: no section titled "Recommended phases". Read the file (readFile with section=…) to see its headings.

<details><summary>Proposed content (verbatim)</summary>

```
1. Add AuditAction.CANCEL to shared-types.
2. Add cancel to ILeaveService + LeaveService.
3. Add POST /leaves/:id/cancel route.
4. LeaveService cancel unit tests.
```

</details>
