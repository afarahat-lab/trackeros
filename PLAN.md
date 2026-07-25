# PLAN.md

## Phase 1: Phase 1: Shared enums and base types

Create src/shared/types/index.ts with the canonical enums and types used across all leave modules:

- `LeaveTypeCode` enum: 'annual' | 'sick' | 'emergency' | 'unpaid' | 'maternity' | 'paternity'
- `LeaveStatus` enum: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
- `EmploymentStatus` type: 'ACTIVE' | 'INACTIVE' | 'TERMINATED'

Also create src/shared/types/index.ts as the single export barrel. Include Jest unit tests in tests/unit/shared/types/ verifying enum values. This phase has no dependencies on prior phases — only on the existing tsconfig.json and jest.config.js at the project root.

## Phase 2: Phase 2: Employee model and repository

Create src/modules/employee/employee.model.ts with the Employee interface (id, employeeNumber, firstName, lastName, email, managerId, department, hireDate, terminationDate, employmentStatus, createdAt, updatedAt, deletedAt) and CreateEmployeeDto. Import EmploymentStatus from src/shared/types/index.ts (created in Phase 1).

Create src/modules/employee/employee.repository.ts with IEmployeeRepository interface and EmployeeRepository class using the pg pool from src/shared/db/connection.ts. Implement findByManagerId, findById, findAll, create, update, softDelete methods.

Create src/modules/employee/index.ts barrel export.

Include Jest unit tests in tests/unit/modules/employee/ for the repository methods (mock the pg pool). This phase depends on src/shared/types/index.ts from Phase 1 and src/shared/db/connection.ts (already exists).

## Phase 3: Phase 3: LeaveType model and repository

Create src/modules/leave/leave-type.model.ts with the LeaveType interface (id, code, name, description, isActive, createdAt, updatedAt) and CreateLeaveTypeDto. Import LeaveTypeCode from src/shared/types/index.ts (Phase 1).

Create src/modules/leave/leave-type.repository.ts with ILeaveTypeRepository interface and LeaveTypeRepository class using the pg pool from src/shared/db/connection.ts. Implement findByCode, findById, findAll, create, update, softDelete methods.

Create src/modules/leave/index.ts barrel export re-exporting LeaveType, CreateLeaveTypeDto, ILeaveTypeRepository, LeaveTypeRepository.

Include Jest unit tests in tests/unit/modules/leave/leave-type.repository.test.ts mocking the pg pool. This phase depends on src/shared/types/index.ts from Phase 1 and src/shared/db/connection.ts (already exists).

## Phase 4: Phase 4: LeavePolicy model and repository

Create src/modules/leave/leave-policy.model.ts with the LeavePolicy interface (id, policyName, leaveTypeId, entitlementDays, accrualRate, maxAccumulation, minimumNoticeDays, requiresManagerApproval, isActive, createdAt, updatedAt) and CreateLeavePolicyDto. Import LeaveType from src/modules/leave/leave-type.model.ts (Phase 3).

Create src/modules/leave/leave-policy.repository.ts with ILeavePolicyRepository interface and LeavePolicyRepository class using the pg pool from src/shared/db/connection.ts. Implement findByLeaveTypeId, findById, findAll, create, update, softDelete methods.

Update src/modules/leave/index.ts to also re-export LeavePolicy, CreateLeavePolicyDto, ILeavePolicyRepository, LeavePolicyRepository.

Include Jest unit tests in tests/unit/modules/leave/leave-policy.repository.test.ts mocking the pg pool. This phase depends on src/modules/leave/leave-type.model.ts from Phase 3 and src/shared/db/connection.ts (already exists).

## Phase 5: Phase 5: LeaveBalance model and repository

Create src/modules/leave/leave-balance.model.ts with the LeaveBalance interface (id, employeeId, leaveTypeId, policyId, entitlementDays, usedDays, pendingDays, accruedDays, carriedForwardDays, expiresAt, year, createdAt, updatedAt) and CreateLeaveBalanceDto.

Create src/modules/leave/leave-balance.repository.ts with ILeaveBalanceRepository interface and LeaveBalanceRepository class using the pg pool from src/shared/db/connection.ts. Implement findByEmployeeId, findByEmployeeIdAndLeaveTypeId, findByEmployeeIdAndYear, create, update, upsert methods.

Update src/modules/leave/index.ts to also re-export LeaveBalance, CreateLeaveBalanceDto, ILeaveBalanceRepository, LeaveBalanceRepository.

Include Jest unit tests in tests/unit/modules/leave/leave-balance.repository.test.ts mocking the pg pool. This phase depends on src/modules/leave/leave-type.model.ts (Phase 3), src/modules/leave/leave-policy.model.ts (Phase 4), and src/shared/db/connection.ts (already exists).

## Phase 6: Phase 6: LeaveRequest model and repository

Create src/modules/leave/leave-request.model.ts with the LeaveRequest interface (id, employeeId, leaveTypeId, startDate, endDate, totalDays, reason, status, managerId, approvedBy, approvedAt, rejectionReason, cancelledAt, createdAt, updatedAt) and CreateLeaveRequestDto. Import LeaveStatus from src/shared/types/index.ts (Phase 1).

Create src/modules/leave/leave-request.repository.ts with ILeaveRequestRepository interface and LeaveRequestRepository class using the pg pool from src/shared/db/connection.ts. Implement findByEmployeeId, findById, findByManagerId, findByStatus, create, updateStatus, findAll methods.

Update src/modules/leave/index.ts to also re-export LeaveRequest, CreateLeaveRequestDto, ILeaveRequestRepository, LeaveRequestRepository.

Include Jest unit tests in tests/unit/modules/leave/leave-request.repository.test.ts mocking the pg pool. This phase depends on src/shared/types/index.ts (Phase 1), src/modules/leave/leave-type.model.ts (Phase 3), and src/shared/db/connection.ts (already exists).

## Phase 7: Phase 7: AuditLog model and repository

Create src/modules/audit/audit-log.model.ts with the AuditLog interface (id, entityType, entityId, action, performedBy, changes, timestamp, metadata) and CreateAuditLogDto. The `action` field uses a union type: 'CREATED' | 'UPDATED' | 'DELETED' | 'APPROVED' | 'REJECTED' | 'CANCELLED'. The `changes` field is Record<string, { from: unknown; to: unknown }>.

Create src/modules/audit/audit-log.repository.ts with IAuditLogRepository interface and AuditLogRepository class using the pg pool from src/shared/db/connection.ts. Implement findByEntityId, findByPerformedBy, create, findAll methods.

Create src/modules/audit/index.ts barrel export.

Include Jest unit tests in tests/unit/modules/audit/audit-log.repository.test.ts mocking the pg pool. This phase depends on src/shared/db/connection.ts (already exists). No dependency on prior leave phases — audit is a cross-cutting concern.

## Phase 8: Phase 8: Leave service with validation and audit

Create src/modules/leave/leave.service.interface.ts with ILeaveService interface declaring: applyForLeave, approveLeave, rejectLeave, cancelLeave, getLeaveBalance, getLeaveHistory, getPendingRequests.

Create src/modules/leave/leave.service.ts with LeaveService class implementing ILeaveService. The service orchestrates across repositories:

- `applyForLeave`: validates employee exists and is ACTIVE (via IEmployeeRepository), validates leave type exists and is active (via ILeaveTypeRepository), checks leave policy for minimumNoticeDays and requiresManagerApproval (via ILeavePolicyRepository), checks balance sufficiency (via ILeaveBalanceRepository), creates the LeaveRequest (via ILeaveRequestRepository), and writes an audit record (via IAuditLogRepository).
- `approveLeave` / `rejectLeave`: validates manager authorization, updates request status, adjusts pending/used days on balance, writes audit record.
- `cancelLeave`: validates ownership, updates status, adjusts balance, writes audit record.
- `getLeaveBalance`: delegates to ILeaveBalanceRepository.
- `getLeaveHistory`: delegates to ILeaveRequestRepository.
- `getPendingRequests`: delegates to ILeaveRequestRepository.findByManagerId.

Use Zod for input validation on all public methods (GP-003). All repository dependencies are injected via constructor.

Update src/modules/leave/index.ts to re-export ILeaveService and LeaveService.

Include Jest unit tests in tests/unit/modules/leave/leave.service.test.ts with all repository dependencies mocked. This phase depends on all prior leave module phases (3-6) for model/repository types, Phase 7 for audit, and Phase 2 for employee repository.

## Phase 9: Phase 9: Leave controller and Fastify routes

Create src/modules/leave/leave.controller.ts with LeaveController class. The controller receives the LeaveService via constructor injection and exposes methods: applyForLeave, approveLeave, rejectLeave, cancelLeave, getLeaveBalance, getLeaveHistory, getPendingRequests. Each method extracts and validates request parameters/body from the Fastify request, calls the corresponding service method, and returns the appropriate HTTP response with status codes (201 for create, 200 for queries, 204 for cancel). Use Zod schemas for request body validation at the boundary (GP-003).

Create src/modules/leave/leave.routes.ts as a Fastify plugin that:
- Instantiates all repositories (EmployeeRepository, LeaveTypeRepository, LeavePolicyRepository, LeaveBalanceRepository, LeaveRequestRepository, AuditLogRepository) using the shared pg pool from src/shared/db/connection.ts
- Instantiates LeaveService with those repositories
- Instantiates LeaveController with the service
- Registers routes: POST /leave/apply, POST /leave/:id/approve, POST /leave/:id/reject, POST /leave/:id/cancel, GET /leave/balance, GET /leave/history, GET /leave/pending

Register the leave routes plugin in src/app.ts alongside the existing uptimeRoutes.

Update src/modules/leave/index.ts to re-export LeaveController and leaveRoutes.

Include Jest integration tests in tests/integration/modules/leave/leave.routes.test.ts using Fastify's inject method with mocked repositories. This phase depends on src/modules/leave/leave.service.ts (Phase 8), all leave repositories (Phases 3-6), employee repository (Phase 2), audit repository (Phase 7), and src/app.ts (already exists).
