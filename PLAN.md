# PLAN.md

## Phase 1: Phase 1 — audit entity query (findByEntity / getByEntity)

Add the generic entity-scoped read to the audit module. Approximately 4 files, all under src/modules/audit/ (the architecture agent's file list is authoritative): audit.repository.interface.ts, audit.repository.ts, audit.service.interface.ts, audit.service.ts.

Read these existing files before generating: src/modules/audit/audit.model.ts (AuditLog, CreateAuditLogInput), src/modules/audit/audit.repository.interface.ts, src/modules/audit/audit.repository.ts (the existing COLUMNS constant, AuditLogRow, mapRow and parseState helpers), src/modules/audit/audit.service.interface.ts, src/modules/audit/audit.service.ts (the existing validate() helper and NotFoundError usage).

1. IAuditRepository (audit.repository.interface.ts) — add `findByEntity(entityType: string, entityId: string): Promise<AuditLog[]>`. It takes NO optional trailing PoolClient: the history read path opens NO transaction and forwards NO PoolClient (shared-db is unchanged by this feature).
2. PgAuditLogRepository (audit.repository.ts) — implement findByEntity with `SELECT ${COLUMNS} FROM audit_logs WHERE entity_type = $1 AND entity_id = $2 ORDER BY occurred_at ASC, id ASC`, reusing the existing COLUMNS constant and mapRow (so before_state/after_state are parsed by the existing parseState helper and returned verbatim as `unknown | null`). Return `result.rows.map(mapRow)` — an empty array when no rows match. No LIMIT and no pagination (bounding is explicitly out of scope). Do NOT add a migration and do NOT change the (entity_type, entity_id) index.
3. IAuditService (audit.service.interface.ts) — add `getByEntity(entityType: string, entityId: string): Promise<AuditLog[]>`.
4. AuditService (audit.service.ts) — implement getByEntity: validate non-empty `entityType` and `entityId` with ValidationError (same style as the existing validate() requiredStrings loop), then delegate to `this.repository.findByEntity(entityType, entityId)` and return the array verbatim. An empty array is a valid, non-error result — never throw NotFoundError for an empty trail.

Binding constraints for this phase: the audit module must stay keyed generically on (entityType, entityId). Do NOT import or reference the literal 'leave_request' anywhere in src/modules/audit/, do NOT import EmployeeRole, and do NOT branch on role — visibility is owned by the leave module. Do not promote anything to src/shared/types/. No tests in this phase (Phase 4 owns tests).

## Phase 2: Phase 2 — LeaveService.getHistory (visibility via existing getById)

Add the history read to the leave module's service layer. Approximately 1 file (src/modules/leave/leave.service.ts), plus the LEAVE_REQUEST_ENTITY_TYPE constant in src/modules/leave/leave.model.ts if it is not already present — the architecture agent's file list is authoritative.

Read these existing files before generating: src/modules/leave/leave.model.ts (LeaveRequest, CreateLeaveRequestInput), src/modules/leave/leave.service.ts (the existing ILeaveService interface, LeaveActor, the constructor's injected collaborators, and the existing getById(actor, requestId) implementation), and src/modules/audit/index.ts (the public entry point that exports AuditLog).

1. src/modules/leave/leave.model.ts — declare and export the module-local constant `LEAVE_REQUEST_ENTITY_TYPE = 'leave_request'` (exact value, exact name). This is its single home; it is NOT promoted to src/shared/types/ and the audit module must never import it.
2. src/modules/leave/leave.service.ts — replace every existing bare `'leave_request'` string literal used as an audit `entityType` with `LEAVE_REQUEST_ENTITY_TYPE` (the write path in create/submit/approve/reject/cancel). A writer and reader that disagree on the literal produce a silently empty trail, which this feature's contract treats as a valid 200.
3. ILeaveService — add `getHistory(actor: LeaveActor, requestId: string): Promise<AuditLog[]>`, importing `AuditLog` from the audit module's public entry point (`../audit`). Do NOT declare a leave-owned projection or a LeaveHistoryEntry type — the audit module's AuditLog entity IS the wire shape.
4. LeaveService.getHistory — implement it as: (a) call the EXISTING `this.getById(actor, requestId)` first and let it throw (this is the only place the ADMIN/MANAGER/own visibility rule is expressed — do NOT re-express it, do NOT branch on EmployeeRole, and do NOT catch or translate its NotFoundError); (b) then return `this.auditService.getByEntity(LEAVE_REQUEST_ENTITY_TYPE, requestId)`. The method is read-only: it opens NO transaction, forwards NO PoolClient, and writes nothing. A visible request with no audit rows returns an empty array (200), never a 404.

This phase depends on Phase 1: read src/modules/audit/audit.service.interface.ts and src/modules/audit/index.ts to confirm the exact `getByEntity(entityType, entityId): Promise<AuditLog[]>` signature before calling it. No route and no tests in this phase (Phases 3 and 4 own those).

## Phase 3: Phase 3 — GET /leaves/:id/history route

Add the HTTP surface for the trail. Approximately 1 file: src/modules/leave/leave.routes.ts.

Read these existing files before generating: src/modules/leave/leave.routes.ts (the existing `resolveActor` helper, the `sendError` helper, the `leaveRoutes(fastify)` registration function, and the existing `GET /leaves/:id` handler as the pattern to mirror), src/modules/leave/leave.service.ts (the ILeaveService.getHistory signature added in Phase 2), and src/modules/audit/index.ts (the AuditLog entity the route serializes).

1. Register `GET /leaves/:id/history` (200) inside the existing `leaveRoutes(fastify)` function, mirroring the existing `GET /leaves/:id` handler exactly: resolve the actor with the existing `resolveActor(request)` helper, call `leaveService.getHistory(actor, request.params.id)`, return the array, and on throw log via `request.log.error` and return `sendError(reply, error)`. Reuse the existing helpers — do NOT add a controller file, do NOT add a new helper, and do NOT import from another module's routes file.
2. The response is the audit module's AuditLog entity serialized as-is: each entry is `{ id, actorId, action, entityType, entityId, beforeState, afterState, occurredAt }`. Do NOT map, project, redact, or rename any field, and do NOT declare a response DTO.
3. Information hiding: a caller who may not see the request must receive the SAME 404 that the existing `getById` produces, never a 403. Do not add any role check, any EmployeeRole branch, or any existence check in the route — the service's getById call is the sole visibility gate and its NotFoundError flows through `sendError` unchanged.
4. A visible request with no audit rows returns 200 with an empty array, not 404. Do not add a 404-on-empty branch.
5. The service instance is resolved the same way the existing handlers do it (`fastify.leaveService` if present, else `createLeaveService()`). No transaction, no repository access, no SQL in the route.

This phase depends on Phase 2: read src/modules/leave/leave.service.ts to confirm the exact `getHistory(actor, requestId)` signature before calling it. No tests in this phase (Phase 4 owns tests).

## Phase 4: Phase 4 — tests: entity-query ordering, endpoint visibility, empty history

Add Jest unit tests for the trail read path. Approximately 2 files (the architecture agent's file list is authoritative): a new audit test file under tests/unit/modules/audit/ and an extension of the existing tests/unit/modules/leave/leave.routes.test.ts (or leave.service.test.ts). No production source changes — Phases 1–3 are fixed contracts.

Read these existing files before generating: src/modules/audit/audit.repository.ts (COLUMNS, mapRow, parseState), src/modules/audit/audit.service.ts, src/modules/leave/leave.service.ts (getHistory and the existing getById visibility rule), src/modules/leave/leave.routes.ts (the new GET /leaves/:id/history handler), and the existing tests/unit/modules/leave/leave.routes.test.ts (the Fastify buildApp + `leaveService` decoration seam and the existing byte-identical-404 assertion pattern).

1. Entity-query ordering — assert `PgAuditLogRepository.findByEntity` issues the entity-scoped query with `WHERE entity_type = $1 AND entity_id = $2 ORDER BY occurred_at ASC, id ASC` (capture the SQL/params through a fake pool injected via the constructor's `dbPool` seam) and that it maps rows through the existing mapRow so `beforeState`/`afterState` come back parsed (null column → null) and `occurredAt` is a Date. Include a tie-break case: two rows with an identical `occurredAt` are returned in ascending `id` order, and the same input returns the same order on a repeat call (stability). Assert an empty result set returns `[]` rather than throwing.
2. Endpoint visibility — via the route seam, `GET /leaves/:id/history` returns 200 with the entries for the request's own employee; a MANAGER reading a direct report's history returns 200; a requester who may not see the request receives the SAME 404 (`{ code: 'NOT_FOUND' }`) as a nonexistent id — assert the two responses are byte-identical, never 403.
3. Empty history — a request that exists and is visible but has no audit rows returns 200 with `[]`, not 404.
4. Assert the response entries carry exactly the fields `{ id, actorId, action, entityType, entityId, beforeState, afterState, occurredAt }` with no added or renamed field.

Use in-memory fakes (no jest.mock of the pg driver), matching the existing suite's conventions. Do not modify any file under src/.
