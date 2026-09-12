# PLAN.md

## Phase 1: Phase 1 — Add AuditAction.CANCEL to shared-types

Add the `CANCEL = 'CANCEL'` member to the `AuditAction` enum in `src/shared/types/index.ts` (the shared-types module owns this cross-module value type). Do NOT reuse UPDATE or DELETE. Read the existing `AuditAction` enum in `src/shared/types/index.ts` before editing so the new member matches the existing member style (string literal values). After adding the member, search the codebase for any consumer that switches exhaustively on `AuditAction` (e.g. `src/modules/audit/audit.service.ts` and any other switch statements) and update those consumers so the new CANCEL case is handled — do not leave a non-exhaustive switch that would fail typecheck. This phase touches approximately 1-2 files (the enum plus any exhaustive-switch consumer). No new modules, no routes, no service logic. Include a Jest unit test under `tests/unit/shared/` asserting the `AuditAction` enum now contains the CANCEL member with value 'CANCEL' (extend the existing shared enum test file if one exists).

## Phase 2: Phase 2 — Add cancel to ILeaveService + LeaveService

Add a `cancel(actor: LeaveActor, requestId: string)` method to `ILeaveService` and implement it in `LeaveService` in `src/modules/leave/leave.service.ts`. This phase depends on `src/shared/types/index.ts` (AuditAction.CANCEL from Phase 1) and the existing `src/modules/leave/leave.service.ts` (ILeaveService, LeaveService, LeaveActor, the eight injected collaborators, and the existing create/submit/approve/reject implementations) — read both before generating code.

Implement `cancel` per the binding rules:
- Authorization: owner may cancel their own DRAFT or SUBMITTED request; the direct manager (`employee.managerId === actor.id`) may cancel an APPROVED request; ADMIN may cancel an APPROVED request for anyone. Mirror the existing `assertCanDecide` shape (ADMIN exempt from the direct-manager check, MANAGER not; no acting on your own request where that rule applies). Throw ForbiddenError otherwise.
- Timing guard: block cancellation once `startDate <= today` (startDate today or in the past) with ConflictError. This makes pro-rating unnecessary.
- Balance release (full `requestedDays`, no pro-rating): DRAFT → no balance change; SUBMITTED → `pendingDays -= requestedDays`; APPROVED → `usedDays -= requestedDays`. Read the balance row with the row lock (`forUpdate` flag) before writing, exactly as submit/approve/reject do.
- Status transition: set status → CANCELLED and populate `cancelledBy = actor.id` and `cancelledAt = now` (the LeaveRequest entity has these fields; ensure the repository's `UpdateLeaveRequestDto`/`FIELD_COLUMNS` map supports `cancelledBy`/`cancelledAt` — if not, add those two fields to the update DTO and column map in `src/modules/leave/leave.repository.ts` as part of this phase).
- Side effects: record a CANCEL audit entry (action `AuditAction.CANCEL`) and insert a synchronous cancellation notification to the affected employee.
- Atomicity: the whole operation (status change, balance release, audit entry, notification) is ONE unit of work via `IUnitOfWork.withTransaction`, with the client threaded through every call.

This phase touches approximately 1-2 files (`leave.service.ts`, and `leave.repository.ts` only if the update DTO/column map lacks `cancelledBy`/`cancelledAt`). No routes, no tests in this phase.

## Phase 3: Phase 3 — Add POST /leaves/:id/cancel route

Add a `POST /leaves/:id/cancel` endpoint to `leaveRoutes(fastify)` in `src/modules/leave/leave.routes.ts`. This phase depends on `src/modules/leave/leave.service.ts` (the `cancel` method added in Phase 2) and the existing `src/modules/leave/leave.routes.ts` (the `resolveActor` helper, `sendError` helper, and the existing four endpoints) — read both before generating code.

Follow the existing route conventions exactly: no controller file (routes call the service directly), `resolveActor` extracts `request.user` and enforces role membership at the API boundary (UnauthorizedError on missing/invalid actor), `sendError` maps `AppError` to `{ error, code }` with the correct status and any other throw to 500. The endpoint returns 200 on success and calls `service.cancel(actor, request.params.id)`. Resolve the service instance from `fastify.leaveService` if present, else `createLeaveService()`, matching the existing endpoints. Ensure `src/modules/leave/index.ts` already re-exports `leaveRoutes` (no change needed unless the route registration signature changed). This phase touches approximately 1 file (`leave.routes.ts`). No service logic, no tests in this phase.

## Phase 4: Phase 4 — LeaveService cancel unit tests

Add Jest unit tests for the `LeaveService.cancel` operation to `tests/unit/modules/leave/leave.service.test.ts` (extend the existing suite from Phase 6c). This phase depends on `src/modules/leave/leave.service.ts` (the `cancel` implementation from Phase 2) and the existing `tests/unit/modules/leave/leave.service.test.ts` (the eight in-memory fakes — FakeLeaveRepository, FakeBalanceRepository, FakeAuditService, FakeNotificationService, FakeValidationService, FakeEmployeeService, FakePolicyService, FakeUnitOfWork — and the containment-based transaction assertions) — read both before generating code. Treat the Phase 2/3 deliverables as fixed contracts; do not modify production source.

Coverage for `cancel`:
- Authorization guards: owner may cancel own DRAFT/SUBMITTED (ForbiddenError on non-owner); direct manager may cancel an APPROVED request for their direct report (ForbiddenError when actor is not the direct manager); ADMIN may cancel an APPROVED request for anyone (ADMIN exempt from the direct-manager check); no acting on your own request where that rule applies.
- Timing guard: ConflictError when `startDate <= today` (today or past).
- Balance release (full `requestedDays`, no pro-rating): DRAFT → no balance change; SUBMITTED → `pendingDays -= requestedDays`; APPROVED → `usedDays -= requestedDays`. Assert the balance row is read with the row lock (`forUpdate` flag) before writing.
- Status transition: status → CANCELLED with `cancelledBy = actor.id` and `cancelledAt` set.
- Side effects: a CANCEL audit entry (action `AuditAction.CANCEL`) and a synchronous cancellation notification to the affected employee.
- Atomicity: assert all steps occur inside the single `withTransaction` callback with the stub client forwarded to each repository/service call (containment-based, matching the existing suite's convention).

This phase touches approximately 1 file (`tests/unit/modules/leave/leave.service.test.ts`).
