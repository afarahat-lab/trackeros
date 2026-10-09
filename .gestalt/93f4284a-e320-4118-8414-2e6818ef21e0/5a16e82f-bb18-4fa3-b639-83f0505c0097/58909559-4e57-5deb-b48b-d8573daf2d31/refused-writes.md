# Refused writes — awaiting a human decision

_Generated 2026-10-08 21:18:59Z · correlation `58909559-4e57-5deb-b48b-d8573daf2d31`._

6 write(s) were refused, 0 of them because the target is a GOVERNANCE file. A refusal is not a judgement that the change is wrong — it is the platform declining to let an agent edit the rules it is judged by. The proposed content is reproduced in full below so it can be applied by hand if it is right.

**To ratify one:** apply the content yourself and commit it, or record the decision as an ADR in `docs/DECISIONS.md`. **To reject one:** delete its section from this file. Leaving this file in place is not a decision — it is a queue.

## 1. `docs/ARCHITECTURE.md`

- **Proposed by:** context-agent
- **Refused because:** refusing a section-addressed write of docs/ARCHITECTURE.md: no section titled "Phase 2 delivered (findPendingDecisions + related_entity_code plumbing)". Read the file (readFile with section=…) to see its headings.

<details><summary>Proposed content (verbatim)</summary>

```
Phase 2 of the recommended list is delivered: the pending-decisions read on the leave repository and the `related_entity_code` plumbing through the notification model/repository. Phases 3–7 are not yet implemented — `LeaveService.cancel` is untouched, `ILeaveService` has no `listPendingDecisions`, and no route exists.

**leave — the pending-decisions read**
- `src/modules/leave/leave.model.ts` — new exported `PendingDecision` interface: `requestId`, `employeeId`, `leaveTypeCode: LeaveTypeCode`, `startDate: Date`, `endDate: Date`, `requestedDays: number`, `status: LeaveStatus`. It is a leave-owned read projection (no `id`, no table) and stays in the module rather than `src/shared/types` — it is a leave concept, not a cross-module contract.
- `src/modules/leave/leave.repository.ts` — `ILeaveRepository` gained `findPendingDecisions(employeeIds?: string[], client?: PoolClient): Promise<PendingDecision[]>`, implemented on `PgLeaveRequestRepository`. The SQL is `SELECT ${COLUMNS} FROM leave_requests WHERE status = 'SUBMITTED'` plus, only when `employeeIds` is defined and non-empty, `AND employee_id = ANY($n)` — the same scoping shape as `findByQuery`, so an absent/empty list applies no employee filter and the caller (an ADMIN) sees every SUBMITTED request. `ORDER BY start_date ASC` (oldest first). It queries through the existing private `db(client)` accessor, returns an array (possibly empty, never null, never a throw), and takes the optional trailing `PoolClient` like every other method. A private `toPendingDecision(request)` helper projects a full `LeaveRequest` down to the seven queue fields.
- `src/modules/leave/index.ts` — `PendingDecision` added to the existing `./leave.model` re-export.

**notification — `related_entity_code` end-to-end**
- `src/modules/notification/notification.model.ts` — `Notification` gained `relatedEntityCode: string | null` (positioned after `relatedEntityId`, before `status`). `CreateNotificationInput` now omits `relatedEntityCode` from the `Omit<...>` and re-adds it as optional (`relatedEntityCode?: string | null`), so existing call sites keep compiling.
- `src/modules/notification/notification.repository.ts` — `NotificationRow` gained `related_entity_code: string | null`; `mapRow` maps it; `COLUMNS` includes it (so `findById`/`updateStatus` return it too); the `create` INSERT lists the column and its placeholder, with `input.relatedEntityCode ?? null` in the matching values position — the repository persists `null` when the call site omits it. `INotificationService`/`NotificationService` are unchanged.

**Tests (interface-satisfaction only)**
- `tests/unit/modules/leave/leave.service.test.ts` — `FakeLeaveRepository` gained `findPendingDecisions`, mirroring the SQL semantics (SUBMITTED-only, `employeeIds` scoping, `startDate` ascending, projection to the seven fields).
- `tests/unit/modules/notification.service.test.ts` — `FakeNotificationRepository` gained `relatedEntityCode: input.relatedEntityCode ?? null` in the object it builds.
- No new test file and no new assertion: the two fakes had to be extended to keep satisfying the expanded interfaces. The plan deferred tests to Phase 6.

**Divergences from the plan / design worth noting:**
- Repository signature: the design specifies `findPendingDecisions(actorId: string, actorRole: EmployeeRole, client?)` returning `LeaveRequest[]`, with role scoping inside the repository. The built method is `findPendingDecisions(employeeIds?: string[], client?)` returning `PendingDecision[]` — role→`employeeIds` resolution is left to the caller (the service, Phase 4) and the repository applies only the employee filter it is handed. This is the shape PLAN.md Phase 2 prescribes.
- Predicate: the design specifies `status = SUBMITTED AND reverses_request_id IS NULL`; the built SQL is `status = 'SUBMITTED'` alone — no second status filter and no `reverses_request_id` filter. This settles the disagreement flagged in Phase 1's divergence note in favour of the plan: a CANCELLED (or decided) request is excluded by the single status predicate, and a reversal row is born CANCELLED so it can never be SUBMITTED.
- Ordering: the design specifies `ORDER BY start_date ASC, id ASC`; the built SQL is `ORDER BY start_date ASC` with no id tie-break, so rows sharing a start date have no deterministic order between reads.
- `PendingDecision` carries `status` even though the queue is SUBMITTED-only — the field is part of the projection's declared shape, not a filter input.
- `relatedEntityCode` is plumbed but not yet written by any caller: `LeaveService.cancel` is unchanged, so no notification is created with a code yet (Phase 3). The column is nullable and the repository never synthesizes a non-null value.

```

</details>

## 2. `docs/DOMAIN.md`

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

`relatedEntityCode` is the human/machine code of the entity named by `relatedEntityType` (for a leave request, its leave type code). It is generic — not leave-specific — and nullable: a notification unrelated to a coded entity, and every row written before the column existed, carries `null`. It is optional at the create call site and the repository persists `null` when omitted.

```

</details>

## 3. `docs/ARCHITECTURE.md`

- **Proposed by:** context-agent
- **Refused because:** refusing a section-addressed write of docs/ARCHITECTURE.md: no section titled "Recommended phases". Read the file (readFile with section=…) to see its headings.

<details><summary>Proposed content (verbatim)</summary>

```
1. Migration: `notifications.related_entity_code` + `leave_requests` status/approver_id indexes (1 file). — **DELIVERED** (see Phase 1 below; the `leave_requests` indexes were deliberately not added).
2. Repositories: `findPendingDecisions` + `related_entity_code` plumbing (2 files). — **DELIVERED** (see Phase 2 below).
3. `LeaveService.cancel`: notify the approver inside the existing unit of work (1 file). — not yet implemented.
4. `LeaveService.listPendingDecisions` (1 file). — not yet implemented.
5. `GET /leaves/pending-decisions` route (1 file). — not yet implemented.
6. Tests: approver notification + pending-decisions read (2 files). — not yet implemented (Phase 2 extended two existing fakes for interface satisfaction only).
7. (optional) Web approvals queue consumes the new endpoint (2 files). — not yet implemented.

```

</details>

## 4. `docs/DOMAIN.md`

- **Proposed by:** context-agent
- **Refused because:** refusing a section-addressed write of docs/DOMAIN.md: no section titled "### Notification". Read the file (readFile with section=…) to see its headings.

<details><summary>Proposed content (verbatim)</summary>

```
| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| recipientId | string | true |
| type | string | true |
| title | string | true |
| message | string | true |
| relatedEntityType | string \| null | false |
| relatedEntityId | string \| null | false |
| relatedEntityCode | string \| null | false |
| status | 'PENDING' \| 'SENT' \| 'READ' \| 'ARCHIVED' | true |
| createdAt | Date | true |
| readAt | Date \| null | false |

`relatedEntityCode` is the human/machine code of the entity named by `relatedEntityType` (for a leave request, its leave type code). It is generic — not leave-specific — and nullable: a notification unrelated to a coded entity, and every row written before the column existed, carries `null`. It is optional at the create call site and the repository persists `null` when omitted.

```

</details>

## 5. `docs/DOMAIN.md`

- **Proposed by:** context-agent
- **Refused because:** refusing a section-addressed write of docs/DOMAIN.md: no section titled "Notification". Read the file (readFile with section=…) to see its headings.

<details><summary>Proposed content (verbatim)</summary>

```
| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| recipientId | string | true |
| type | string | true |
| title | string | true |
| message | string | true |
| relatedEntityType | string \| null | false |
| relatedEntityId | string \| null | false |
| relatedEntityCode | string \| null | false |
| status | 'PENDING' \| 'SENT' \| 'READ' \| 'ARCHIVED' | true |
| createdAt | Date | true |
| readAt | Date \| null | false |

`relatedEntityCode` is the human/machine code of the entity named by `relatedEntityType` (for a leave request, its leave type code). It is generic — not leave-specific — and nullable: a notification unrelated to a coded entity, and every row written before the column existed, carries `null`. It is optional at the create call site and the repository persists `null` when omitted.

```

</details>

## 6. `docs/ARCHITECTURE.md`

- **Proposed by:** context-agent
- **Refused because:** refusing a section-addressed write of docs/ARCHITECTURE.md: no section titled "Phase 2 delivered (findPendingDecisions + related_entity_code plumbing)". Read the file (readFile with section=…) to see its headings.

<details><summary>Proposed content (verbatim)</summary>

```
Phase 2 of the recommended list is delivered: the pending-decisions read on the leave repository and the `related_entity_code` plumbing through the notification model/repository. Phases 3–7 are not yet implemented — `LeaveService.cancel` is untouched, `ILeaveService` has no `listPendingDecisions`, and no route exists.

**leave — the pending-decisions read**
- `src/modules/leave/leave.model.ts` — new exported `PendingDecision` interface: `requestId`, `employeeId`, `leaveTypeCode: LeaveTypeCode`, `startDate: Date`, `endDate: Date`, `requestedDays: number`, `status: LeaveStatus`. It is a leave-owned read projection (no `id`, no table) and stays in the module rather than `src/shared/types` — it is a leave concept, not a cross-module contract.
- `src/modules/leave/leave.repository.ts` — `ILeaveRepository` gained `findPendingDecisions(employeeIds?: string[], client?: PoolClient): Promise<PendingDecision[]>`, implemented on `PgLeaveRequestRepository`. The SQL is `SELECT ${COLUMNS} FROM leave_requests WHERE status = 'SUBMITTED'` plus, only when `employeeIds` is defined and non-empty, `AND employee_id = ANY($n)` — the same scoping shape as `findByQuery`, so an absent/empty list applies no employee filter and the caller (an ADMIN) sees every SUBMITTED request. `ORDER BY start_date ASC` (oldest first). It queries through the existing private `db(client)` accessor, returns an array (possibly empty, never null, never a throw), and takes the optional trailing `PoolClient` like every other method. A private `toPendingDecision(request)` helper projects a full `LeaveRequest` down to the seven queue fields.
- `src/modules/leave/index.ts` — `PendingDecision` added to the existing `./leave.model` re-export.

**notification — `related_entity_code` end-to-end**
- `src/modules/notification/notification.model.ts` — `Notification` gained `relatedEntityCode: string | null` (positioned after `relatedEntityId`, before `status`). `CreateNotificationInput` now omits `relatedEntityCode` from the `Omit<...>` and re-adds it as optional (`relatedEntityCode?: string | null`), so existing call sites keep compiling.
- `src/modules/notification/notification.repository.ts` — `NotificationRow` gained `related_entity_code: string | null`; `mapRow` maps it; `COLUMNS` includes it (so `findById`/`updateStatus` return it too); the `create` INSERT lists the column and its placeholder, with `input.relatedEntityCode ?? null` in the matching values position — the repository persists `null` when the call site omits it. `INotificationService`/`NotificationService` are unchanged.

**Tests (interface-satisfaction only)**
- `tests/unit/modules/leave/leave.service.test.ts` — `FakeLeaveRepository` gained `findPendingDecisions`, mirroring the SQL semantics (SUBMITTED-only, `employeeIds` scoping, `startDate` ascending, projection to the seven fields).
- `tests/unit/modules/notification.service.test.ts` — `FakeNotificationRepository` gained `relatedEntityCode: input.relatedEntityCode ?? null` in the object it builds.
- No new test file and no new assertion: the two fakes had to be extended to keep satisfying the expanded interfaces. The plan deferred tests to Phase 6.

**Divergences from the plan / design worth noting:**
- Repository signature: the design specifies `findPendingDecisions(actorId: string, actorRole: EmployeeRole, client?)` returning `LeaveRequest[]`, with role scoping inside the repository. The built method is `findPendingDecisions(employeeIds?: string[], client?)` returning `PendingDecision[]` — role→`employeeIds` resolution is left to the caller (the service, Phase 4) and the repository applies only the employee filter it is handed. This is the shape PLAN.md Phase 2 prescribes.
- Predicate: the design specifies `status = SUBMITTED AND reverses_request_id IS NULL`; the built SQL is `status = 'SUBMITTED'` alone — no second status filter and no `reverses_request_id` filter. This settles the disagreement flagged in Phase 1's divergence note in favour of the plan: a CANCELLED (or decided) request is excluded by the single status predicate, and a reversal row is born CANCELLED so it can never be SUBMITTED.
- Ordering: the design specifies `ORDER BY start_date ASC, id ASC`; the built SQL is `ORDER BY start_date ASC` with no id tie-break, so rows sharing a start date have no deterministic order between reads.
- `PendingDecision` carries `status` even though the queue is SUBMITTED-only — the field is part of the projection's declared shape, not a filter input.
- `relatedEntityCode` is plumbed but not yet written by any caller: `LeaveService.cancel` is unchanged, so no notification is created with a code yet (Phase 3). The column is nullable and the repository never synthesizes a non-null value.

```

</details>
