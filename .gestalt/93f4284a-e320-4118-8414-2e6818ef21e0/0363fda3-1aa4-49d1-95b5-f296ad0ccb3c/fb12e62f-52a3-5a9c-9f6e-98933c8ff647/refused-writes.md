# Refused writes — awaiting a human decision

_Generated 2026-10-09 00:35:33Z · correlation `fb12e62f-52a3-5a9c-9f6e-98933c8ff647`._

1 write(s) were refused, 0 of them because the target is a GOVERNANCE file. A refusal is not a judgement that the change is wrong — it is the platform declining to let an agent edit the rules it is judged by. The proposed content is reproduced in full below so it can be applied by hand if it is right.

**To ratify one:** apply the content yourself and commit it, or record the decision as an ADR in `docs/DECISIONS.md`. **To reject one:** delete its section from this file. Leaving this file in place is not a decision — it is a queue.

## 1. `docs/ARCHITECTURE.md`

- **Proposed by:** context-agent
- **Refused because:** refusing a section-addressed write of docs/ARCHITECTURE.md: no section titled "Phase 6 delivered (approver notification + pending-decisions tests)". Read the file (readFile with section=…) to see its headings.

<details><summary>Proposed content (verbatim)</summary>

```
Recommended phase 6 — the feature's test phase — is delivered, and a follow-up hardening pass extended its route block. TWO files changed, both test-only; no file under `src/` was touched (phases 1–5 are fixed contracts).

**`tests/unit/modules/leave/leave.service.test.ts`** — extended additively; every pre-existing case is unchanged. `FakeLeaveRepository` gained two recorded-call members (`findPendingCalls: (string[] | undefined)[]`, `pendingOverride: PendingDecision[] | null`) and `findPendingDecisions` now records its `employeeIds` argument and returns `pendingOverride` when set; `LEAVE_REQUEST_ENTITY_TYPE` was added to the existing `src/shared/types` import. Two new describe blocks:

- **`cancel notifications`** (13 cases) — pins the approver-notification contract built in phase 3. A SUBMITTED cancellation by the owner produces exactly two `notificationService.create` calls: `inputs[0]` the requester (no `relatedEntityCode`), `inputs[1]` the requester's direct manager resolved from `employeeService.getEmployeeById(...).managerId`, carrying `relatedEntityId = 'lr-1'`, `relatedEntityCode = LeaveTypeCode.ANNUAL` (`'annual'`, verbatim), `relatedEntityType`/`type` both `'leave_request'`, and the request id plus leave type in `message`. The GP-008 APPROVED path notifies the ORIGINAL row's `approverId`, keyed to the ORIGINAL id — asserted against the reversal row's own id, which differs and carries `approverId = null`. DRAFT notifies the requester only. A null `managerId` (SUBMITTED) and a null `approverId` (APPROVED) both still cancel successfully with exactly one notification and `afterState.approverNotificationSkipped === true` on the single CANCEL entry; when a recipient resolves the marker is absent (`undefined`), not `false`. Self-notification is not suppressed: a manager cancelling a direct report's request, and an owner who is their own resolved manager, each still produce two. Every case asserts `uow.callCount === 1` and `notificationService.createClients` equal to the stub client per call.
- **`listPendingDecisions`** (6 cases) — ADMIN passes no `employeeIds` (the recorded argument is `undefined`) and sees only SUBMITTED rows; MANAGER passes `[actor.id, ...directReportIds]`; the repository's array is returned by identity (`toBe`), proving no copy, re-sort or filter; an empty queue resolves to `[]`; no transaction is opened and no client is forwarded (`uow.callCount === 0`, `findPendingCalls === [undefined]`); a missing actor throws `UnauthorizedError` with no transaction.

**`tests/unit/modules/leave/leave.routes.test.ts`** — a `describe('leave routes — GET /leaves/pending-decisions')` block drives the handler through the file's existing seam (the service assigned to `fastify.leaveService`, plus a `preHandler` that sets `request.user`), with `PendingDecision` added to the existing `leave.model` import. The block holds **11 cases**: the original 5 — 200 with the queue for an ADMIN (body equal to the JSON round-trip of the service's array), 200 with `[]` for an empty queue (never 404), 401 `{ code: 'UNAUTHORIZED' }` with the service never called when no actor is present, the resolved actor forwarded unchanged (`{ id: 'mgr-1', role: MANAGER }`, called once), and a bare array of exactly the seven `PendingDecision` fields with no wrapper and no `data` property — plus 6 added by the hardening pass:

- **200 with the queue for a MANAGER**, asserting `listPendingDecisions` was called with the actor object `{ id: 'mgr-1', role: MANAGER }`: the route forwards the actor and does not scope the queue itself.
- **The registration-order constraint is now asserted directly, not merely implied.** A second Fastify instance is built with BOTH `listPendingDecisions` and a `getById` that throws `NotFoundError`; injecting the static path returns 200 and `getById` is asserted `not.toHaveBeenCalled()`. Had the parametric route won, the request would have resolved as `id = 'pending-decisions'` and produced a 404 (or a 500). This is the first case that fails for the ordering reason alone rather than as a side effect of the 200 assertions.
- **401 `{ code: 'UNAUTHORIZED' }` when the authenticated user carries an out-of-enum role** (`'SUPERUSER' as unknown as EmployeeRole`), with the service never called — `resolveActor`'s `EmployeeRole` membership check, not only its id-presence check.
- **Dates are serialized as ISO 8601 strings on the wire** (`'2030-03-04T00:00:00.000Z'`), preserving the values the service returned.
- **The service's array is returned verbatim** — a reversed fixture comes back in the same order (`['lr-2', 'lr-1']`), proving the route neither re-sorts nor caps the queue.
- **500 with the generic body `{ error: 'Internal Server Error' }`** when the service throws, and the response body does not contain the dependency's message (`'database exploded'`) — `sendError`'s non-`AppError` branch.

**Divergences from the plan worth noting:**
- The plan's phase 6 was scoped to "2 files"; the committed diff matches (the two test files). The plan's success criteria are met, with the SUBMITTED two-notification assertion added as a NEW case rather than by editing the pre-existing SUBMITTED case (the plan's own ambiguity), so the additive-only constraint holds.
- The plan described the skip marker as living in the CANCEL entry's "metadata"; the built service writes it as a top-level `afterState.approverNotificationSkipped` boolean, and the tests assert that built shape.
- The plan listed an "in-place APPROVED" cancellation path alongside the GP-008 reversal path; no such path exists in the built service, so APPROVED coverage is the reversal path only.
- The plan's `listPendingDecisions` coverage did not include the identity assertion (`toBe`) on the returned array; the implementation adds it, which is what makes "verbatim, no copy" observable.
- The hardening pass added no new file and no new seam: the 6 cases reuse the block's existing `buildApp` helper, and the ordering case builds its own bare `Fastify()` instance (decorating `leaveService` and `request.user` by hand) because it needs a second service method on the same instance. The route's 500 branch and its ISO date serialization were previously unasserted at the HTTP boundary; both are now pinned.

```

</details>
