# Refused writes — awaiting a human decision

_Generated 2026-10-08 21:41:51Z · correlation `993985ba-c24c-5be9-bb2c-cb677d1481cd`._

3 write(s) were refused, 0 of them because the target is a GOVERNANCE file. A refusal is not a judgement that the change is wrong — it is the platform declining to let an agent edit the rules it is judged by. The proposed content is reproduced in full below so it can be applied by hand if it is right.

**To ratify one:** apply the content yourself and commit it, or record the decision as an ADR in `docs/DECISIONS.md`. **To reject one:** delete its section from this file. Leaving this file in place is not a decision — it is a queue.

## 1. `docs/ARCHITECTURE.md`

- **Proposed by:** context-agent
- **Refused because:** refusing a section-addressed write of docs/ARCHITECTURE.md: no section titled "Phase 3 delivered (approver notification in LeaveService.cancel)". Read the file (readFile with section=…) to see its headings.

<details><summary>Proposed content (verbatim)</summary>

```
Phase 3 of the recommended list is delivered: ONE production file, `src/modules/leave/leave.service.ts`, plus the corresponding extension of `tests/unit/modules/leave/leave.service.test.ts`. No route, repository, model, migration, or other module changed; phases 4–7 are not yet implemented.

**Built shape**

- `LeaveService.cancel` emits a SECOND `notificationService.create` call for a SUBMITTED or APPROVED cancellation, immediately after the existing requester notification and inside the SAME `uow.withTransaction` callback, with the same `client` threaded through. The requester notification is byte-identical to before (no `relatedEntityCode`).
- The approver notification is `{ recipientId: <resolved>, type: 'leave_request', title: 'Leave request cancelled', message: 'Leave request <ORIGINAL id> (<leaveTypeCode>) was cancelled.', relatedEntityType: 'leave_request', relatedEntityId: <ORIGINAL request id>, relatedEntityCode: request.leaveTypeCode }`. `relatedEntityCode` carries the canonical lowercase `leaveTypeCode` verbatim; `type` stays the existing literal; no new discriminator, DTO, enum member, or shared type.
- On the GP-008 reversal path the recipient is the ORIGINAL row's `request.approverId` and `relatedEntityId` is the ORIGINAL request id — never the reversal row's id or its null `approverId`.
- On the SUBMITTED path the recipient is `(await this.employeeService.getEmployeeById(request.employeeId)).managerId`.
- DRAFT emits exactly ONE notification (requester only). Self-notification is not suppressed: the two-call count is unconditional for SUBMITTED/APPROVED regardless of who cancels.

`resolveApproverRecipient(request: LeaveRequest): Promise<string | null>` — private helper on `LeaveService`, NOT on `ILeaveService`. It is called ONCE per cancellation, BEFORE `uow.withTransaction` opens, because `IEmployeeService.getEmployeeById` takes no `PoolClient`; no employee read therefore occurs inside the transaction callback. It returns `request.approverId` for APPROVED, the requester's `managerId` for SUBMITTED, and `null` for DRAFT (short-circuiting before any employee read). It never throws for a missing recipient.

**Skip marker (the ambiguity the design left open, now settled).** When the resolved recipient is `null` AND the request was SUBMITTED or APPROVED, the CANCEL audit entry's `afterState` is the row spread with a single boolean key — `{ ...updated, approverNotificationSkipped: true }` on the in-place path, `{ ...reversal, approverNotificationSkipped: true }` on the reversal path. The entry's shape is otherwise unchanged (`action: AuditAction.CANCEL`, `entityType: LEAVE_REQUEST_ENTITY_TYPE`, `entityId` = the ORIGINAL request id, `beforeState` = the original request). The marker is emitted ONLY for the null-recipient case; a DRAFT cancellation carries no marker (its null recipient is by design, not a skip). The cancellation still succeeds — no `ConflictError`, no escalation, no ADMIN fallback, no backfill.

**Divergences from the design text (code as built)**

- *Recipient resolution timing*: the *Cross-cutting contracts* → **Transaction** paragraph and business rule 11 say the approver is resolved "inside the same callback" / "inside the unit of work". The built code resolves it BEFORE the transaction opens (the phase plan's rule, forced by `getEmployeeById` taking no client). The observable effect is nil — the recipient is still read from the ORIGINAL row and the notification still joins the transaction — but the ordering is the opposite of the design sentence.
- *Leave-type source*: business rule 3 says the reversal path's leave type is "the reversal row's `leaveTypeCode` (copied verbatim)". The built code reads `request.leaveTypeCode` from the ORIGINAL row. The two are byte-identical by construction (the reversal copies the field verbatim), so the notification payload is unchanged.
- *Copy*: the approver notification's `title` is identical to the requester's (`'Leave request cancelled'`); only the `message` differs (`Leave request <id> (<type>) was cancelled.` vs `Your leave request <id> was cancelled.`). The design left copy open; the two notifications are distinguishable by recipient and message, not by title.
- *DDL*: no migration in this phase — the `leave_requests` `status`/`approver_id` indexes and the `findPendingDecisions` predicate remain as recorded in *Phase 1 delivered* above.

**Test coverage delivered.** The committed diff changes exactly ONE existing test: the SUBMITTED-cancellation case, from "sends exactly one cancellation notification for the original" to "sends exactly two cancellation notifications, one per recipient". It asserts `notificationService.inputs` has length 2, that `inputs[0]` is the unchanged requester notification (`recipientId === REQUESTER_ID`, `relatedEntityId === 'lr-1'`), and that `inputs[1]` is the approver notification (`recipientId === MANAGER_ID`, `relatedEntityId === 'lr-1'`, `relatedEntityCode === 'annual'`, `type === 'leave_request'`). The requester-then-approver call ORDER is therefore load-bearing in the test. No new fake, fixture, or recorded-call array was needed — the existing eight in-memory fakes were reused unchanged.

```

</details>

## 2. `docs/ARCHITECTURE.md`

- **Proposed by:** context-agent
- **Refused because:** refusing a section-addressed write of docs/ARCHITECTURE.md: no section titled "Cross-cutting contracts". Read the file (readFile with section=…) to see its headings.

<details><summary>Proposed content (verbatim)</summary>

```
**Transaction.** Cancelling a SUBMITTED or APPROVED request performs, in ONE unit of work: (a) the status change — an in-place `update` to CANCELLED for SUBMITTED, or the GP-008 insert of a NEW CANCELLED reversal row for APPROVED; (b) the balance release — `pendingDays -= requestedDays` for SUBMITTED, `usedDays -= requestedDays` for APPROVED; (c) the CANCEL audit entry (unchanged in shape); (d) the approver notification insert. Repository and service methods that must join a caller's transaction take an OPTIONAL trailing `client?: PoolClient` defaulting to the shared pool. `LeaveService.cancel` calls `this.uow.withTransaction(async (client) => { ... })`; `PgUnitOfWork` acquires a client, issues BEGIN, runs the callback, COMMITs on resolve / ROLLBACKs on throw, and always releases the client. Inside the callback the SAME `client` is threaded to every participating call. `BEGIN`/`COMMIT`/`ROLLBACK` appear ONLY in `PgUnitOfWork`. The approver recipient is resolved from the ORIGINAL row: for an APPROVED request, `request.approverId` (the reversal row's `approverId` is null by construction); for a SUBMITTED request, `employeeService.getEmployeeById(request.employeeId).managerId`. A DRAFT cancellation notifies nobody and performs no balance read or write. `GET /leaves/pending-decisions` is read-only: it opens NO transaction and forwards NO client.

> **As built (Phase 3):** recipient resolution happens BEFORE `uow.withTransaction` opens, not inside the callback — `IEmployeeService.getEmployeeById` takes no `PoolClient`, so the employee read cannot join the transaction. The notification INSERT still joins it. See *Phase 3 delivered* below.

```

</details>

## 3. `docs/DOMAIN.md`

- **Proposed by:** context-agent
- **Refused because:** refusing a section-addressed write of docs/DOMAIN.md: no section titled "Notification". Read the file (readFile with section=…) to see its headings.

<details><summary>Proposed content (verbatim)</summary>

```
| relatedEntityType | string \| null | false |
| relatedEntityId | string \| null | false |
| relatedEntityCode | string \| null | false |
| status | 'PENDING' \| 'SENT' \| 'READ' \| 'ARCHIVED' | true |
| createdAt | Date | true |
| readAt | Date \| null | false |

`relatedEntityCode` is a generic, nullable code for whatever `relatedEntityType` names (for a leave-cancellation notification, the request's `leaveTypeCode`). It is optional on `CreateNotificationInput` and persisted as `null` when a call site omits it.

```

</details>
