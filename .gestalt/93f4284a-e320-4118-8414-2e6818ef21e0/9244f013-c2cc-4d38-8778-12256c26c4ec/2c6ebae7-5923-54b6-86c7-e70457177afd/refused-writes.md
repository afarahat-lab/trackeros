# Refused writes — awaiting a human decision

_Generated 2026-10-09 00:15:12Z · correlation `2c6ebae7-5923-54b6-86c7-e70457177afd`._

1 write(s) were refused, 0 of them because the target is a GOVERNANCE file. A refusal is not a judgement that the change is wrong — it is the platform declining to let an agent edit the rules it is judged by. The proposed content is reproduced in full below so it can be applied by hand if it is right.

**To ratify one:** apply the content yourself and commit it, or record the decision as an ADR in `docs/DECISIONS.md`. **To reject one:** delete its section from this file. Leaving this file in place is not a decision — it is a queue.

## 1. `docs/ARCHITECTURE.md`

- **Proposed by:** context-agent
- **Refused because:** refusing a section-addressed write of docs/ARCHITECTURE.md: no section titled "Phase 6 delivered (approver notification + pending-decisions tests)". Read the file (readFile with section=…) to see its headings.

<details><summary>Proposed content (verbatim)</summary>

```
Recommended phase 6 — the feature's test phase — is delivered. TWO files changed, both test-only; no file under `src/` was touched (phases 1–5 are fixed contracts).

**`tests/unit/modules/leave/leave.service.test.ts`** — extended additively; every pre-existing case is unchanged. `FakeLeaveRepository` gained two recorded-call members (`findPendingCalls: (string[] | undefined)[]`, `pendingOverride: PendingDecision[] | null`) and `findPendingDecisions` now records its `employeeIds` argument and returns `pendingOverride` when set; `LEAVE_REQUEST_ENTITY_TYPE` was added to the existing `src/shared/types` import. Two new describe blocks:

- **`cancel notifications`** (13 cases) — pins the approver-notification contract built in phase 3. A SUBMITTED cancellation by the owner produces exactly two `notificationService.create` calls: `inputs[0]` the requester (no `relatedEntityCode`), `inputs[1]` the requester's direct manager resolved from `employeeService.getEmployeeById(...).managerId`, carrying `relatedEntityId = 'lr-1'`, `relatedEntityCode = LeaveTypeCode.ANNUAL` (`'annual'`, verbatim), `relatedEntityType`/`type` both `'leave_request'`, and the request id plus leave type in `message`. The GP-008 APPROVED path notifies the ORIGINAL row's `approverId`, keyed to the ORIGINAL id — asserted against the reversal row's own id, which differs and carries `approverId = null`. DRAFT notifies the requester only. A null `managerId` (SUBMITTED) and a null `approverId` (APPROVED) both still cancel successfully with exactly one notification and `afterState.approverNotificationSkipped === true` on the single CANCEL entry; when a recipient resolves the marker is absent (`undefined`), not `false`. Self-notification is not suppressed: a manager cancelling a direct report's request, and an owner who is their own resolved manager, each still produce two. Every case asserts `uow.callCount === 1` and `notificationService.createClients` equal to the stub client per call.
- **`listPendingDecisions`** (13 cases) — the queue read, pinned against the built service. ADMIN passes NO `employeeIds` (the recorded argument is `undefined`, asserted `not.toEqual([])` — an empty array would be a filter that matches nothing) and sees every SUBMITTED request regardless of requester; MANAGER passes exactly `[actor.id, ...directReportIds]` (own id plus direct reports, one level — a non-report's manager and an unrelated employee are never in scope); EMPLOYEE passes `[actor.id]` only. The repository's array is returned by identity (`toBe(repository.pendingOverride)`) with a deliberately scrambled `startDate` order, proving no copy, no re-sort (the service must not impose the repository's `start_date ASC`) and no filter. An empty queue resolves to `[]` (`Array.isArray` true) for both MANAGER and ADMIN, never an error. No transaction is opened and no client is forwarded for any role (`uow.callCount === 0`; `findPendingCalls` equals `[undefined, [MANAGER_ID, REQUESTER_ID]]` across an ADMIN then a MANAGER call — `findPendingDecisions` takes only `employeeIds`). A missing actor throws `UnauthorizedError` before the repository is touched (`findPendingCalls` empty, `uow.callCount === 0`), including the `undefined as unknown as LeaveActor` case.

**`tests/unit/modules/leave/leave.routes.test.ts`** — a new `describe('leave routes — GET /leaves/pending-decisions')` (5 cases) drives the handler through the file's existing seam (the service assigned to `fastify.leaveService`, plus a `preHandler` that sets `request.user`), with `PendingDecision` added to the existing `leave.model` import. It asserts 200 with the queue for an ADMIN (body equal to the JSON round-trip of the service's array), 200 with `[]` for an empty queue (never 404), 401 `{ code: 'UNAUTHORIZED' }` with the service never called when no actor is present, the resolved actor forwarded unchanged (`{ id: 'mgr-1', role: MANAGER }`, called once), and a bare array of exactly the seven `PendingDecision` fields with no wrapper and no `data` property. Because the tests register `leaveRoutes` and inject the static path, they also pin ADR-004's registration-order constraint: registered after `GET /leaves/:id`, the request would resolve as `id = 'pending-decisions'` and the 200 assertions would fail.

**Follow-up delivered (this phase's committed diff).** `tests/unit/modules/leave/leave.service.test.ts` alone changed: SEVEN cases were added to the `listPendingDecisions` block (6 → 13), all described above — the ADMIN no-filter case, the MANAGER own-id-plus-reports case, the EMPLOYEE own-id case, the verbatim/order-preserved case, the empty-queue case, the no-unit-of-work case, and the absent-actor case. No `src/` file, no route test, and no other test file changed; the `cancel notifications` block and `leave.routes.test.ts` are unchanged by this phase.

**Divergences from the plan worth noting:**
- The plan's phase 6 was scoped to "2 files"; the committed diff matches (the two test files). The plan's success criteria are met, with the SUBMITTED two-notification assertion added as a NEW case rather than by editing the pre-existing SUBMITTED case (the plan's own ambiguity), so the additive-only constraint holds.
- The plan described the skip marker as living in the CANCEL entry's "metadata"; the built service writes it as a top-level `afterState.approverNotificationSkipped` boolean, and the tests assert that built shape.
- The plan listed an "in-place APPROVED" cancellation path alongside the GP-008 reversal path; no such path exists in the built service, so APPROVED coverage is the reversal path only.
- The plan's `listPendingDecisions` coverage did not include the identity assertion (`toBe`) on the returned array; the implementation adds it, which is what makes "verbatim, no copy" observable.
- **Queue scoping contradicts *Business rules (reconciled)* rule 7 above.** Rule 7 states a MANAGER sees their direct reports' SUBMITTED requests "and not their own" and an EMPLOYEE "sees none". The built `LeaveService.listPendingDecisions` mirrors `list`'s branch instead: MANAGER → `[actor.id, ...directReportIds]` (own requests INCLUDED), EMPLOYEE → `[actor.id]` (own only), ADMIN → no filter. The tests pin the built behaviour; rule 7's wording is the unbuilt design claim.
- The design's `findPendingDecisions(actorId, actorRole)` signature is not built (see the *Repository interfaces* divergence above); the tests pin the built `findPendingDecisions(employeeIds?)` shape, including that no `client` argument is forwarded on this read path.

```

</details>
