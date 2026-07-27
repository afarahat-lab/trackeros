# PLAN.md

## Phase 1: Phase 1: Shared leave enums and types

Create src/shared/types/leave.enums.ts defining the LeaveStatus enum (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED) and LeaveType enum (annual, sick, emergency, unpaid, maternity, paternity). Create src/shared/types/index.ts as a barrel export re-exporting both enums. These are the canonical enum definitions referenced by all downstream leave, policy, and balance modules. Include Jest unit tests in tests/unit/shared/types/leave.enums.spec.ts verifying enum values.

## Phase 2: Phase 2: LeaveRequest model and repository

Create src/modules/leave/leave.model.ts with the LeaveRequest interface (id, employeeId, leaveTypeId, startDate, endDate, reason, status, approvedBy, approvedAt, rejectedReason, createdAt, updatedAt), CreateLeaveRequestDto, UpdateLeaveRequestDto, and LeaveRequestQueryParams. Import LeaveStatus from src/shared/types/leave.enums.ts (Phase 1). Create src/modules/leave/leave.repository.ts with ILeaveRepository interface and KnexLeaveRepository class implementing it — methods: findById, findByEmployeeId, findByStatus, create, update, findAll (with query params). Depends on src/shared/db/connection.ts for the Knex instance. Include Jest unit tests in tests/unit/modules/leave/leave.repository.spec.ts.

## Phase 3: Phase 3: LeavePolicy model and repository

Create src/modules/policy/policy.model.ts with the LeavePolicy interface (id, policyName, leaveTypeId, entitlementDays, accrualRate, maxAccumulation, minimumNoticeDays, requiresManagerApproval, isActive, createdAt, updatedAt). Import LeaveType from src/shared/types/leave.enums.ts (Phase 1). Create src/modules/policy/policy.repository.ts with IPolicyRepository interface and KnexPolicyRepository class — methods: findById, findByLeaveType, findActive, create, update, findAll. Depends on src/shared/db/connection.ts. Include Jest unit tests in tests/unit/modules/policy/policy.repository.spec.ts.

## Phase 4: Phase 4: LeaveBalance model and repository

Create src/modules/balance/balance.model.ts with the LeaveBalance interface (id, employeeId, policyId, totalEntitlement, usedDays, remainingDays, fiscalYear, status, createdAt, updatedAt). Create src/modules/balance/balance.repository.ts with IBalanceRepository interface and KnexBalanceRepository class — methods: findByEmployeeId, findByEmployeeAndPolicy, findByEmployeeAndFiscalYear, create, update, upsert. Depends on src/shared/db/connection.ts. Include Jest unit tests in tests/unit/modules/balance/balance.repository.spec.ts.

## Phase 5: Phase 5: Employee model and repository

Create src/modules/employee/employee.model.ts with the Employee interface (id, employeeNumber, firstName, lastName, email, managerId, department, hireDate, terminationDate, employmentStatus, createdAt, updatedAt, deletedAt). Create src/modules/employee/employee.repository.ts with IEmployeeRepository interface and KnexEmployeeRepository class — methods: findById, findByEmployeeNumber, findByManagerId, findByDepartment, create, update, softDelete. Depends on src/shared/db/connection.ts. Include Jest unit tests in tests/unit/modules/employee/employee.repository.spec.ts.

## Phase 6: Phase 6: Leave service

Create src/modules/leave/leave.service.interface.ts with ILeaveService interface declaring: createLeaveRequest(dto: CreateLeaveRequestDto), approveLeave(id, approverId), rejectLeave(id, approverId, reason), cancelLeave(id, employeeId), findById(id), findByEmployeeId(employeeId), findAll(query: LeaveRequestQueryParams). Create src/modules/leave/leave.service.ts with LeaveService class implementing ILeaveService. The service orchestrates the full leave lifecycle: validates employee is ACTIVE via IEmployeeRepository, validates policy rules via IPolicyRepository (minimumNoticeDays, requiresManagerApproval), checks balance sufficiency via IBalanceRepository, creates the request, and on approval deducts balance / on cancellation restores balance. Depends on src/modules/leave/leave.model.ts and src/modules/leave/leave.repository.ts (Phase 2), src/modules/policy/policy.repository.ts (Phase 3), src/modules/balance/balance.repository.ts (Phase 4), src/modules/employee/employee.repository.ts (Phase 5). Include Jest unit tests in tests/unit/modules/leave/leave.service.spec.ts.

## Phase 7: Phase 7: Leave controller and routes

Create src/modules/leave/leave.controller.ts with LeaveController class that validates incoming HTTP requests (using Zod schemas for CreateLeaveRequestDto, UpdateLeaveRequestDto, LeaveRequestQueryParams) and delegates to ILeaveService. Create src/modules/leave/leave.routes.ts registering Fastify routes: POST /leave/requests, GET /leave/requests, GET /leave/requests/:id, PATCH /leave/requests/:id, POST /leave/requests/:id/approve, POST /leave/requests/:id/reject, POST /leave/requests/:id/cancel. Create src/modules/leave/index.ts barrel exporting the public surface. Depends on src/modules/leave/leave.service.interface.ts and src/modules/leave/leave.service.ts (Phase 6), src/modules/leave/leave.model.ts (Phase 2). Register routes in src/app.ts. Include Jest integration tests in tests/integration/modules/leave/leave.routes.spec.ts.

## Phase 8: Phase 8: Policy service, controller, and routes

Create src/modules/policy/policy.service.interface.ts with IPolicyService interface declaring: createPolicy, updatePolicy, deactivatePolicy, findById, findByLeaveType, findAllActive. Create src/modules/policy/policy.service.ts with PolicyService class implementing IPolicyService. Create src/modules/policy/policy.controller.ts with PolicyController validating inputs via Zod and delegating to IPolicyService. Create src/modules/policy/policy.routes.ts registering Fastify routes: POST /policies, GET /policies, GET /policies/:id, PATCH /policies/:id, DELETE /policies/:id. Create src/modules/policy/index.ts barrel export. Depends on src/modules/policy/policy.model.ts and src/modules/policy/policy.repository.ts (Phase 3). Register routes in src/app.ts. Include Jest integration tests in tests/integration/modules/policy/policy.routes.spec.ts.

## Phase 9: Phase 9: Balance service, controller, and routes

Create src/modules/balance/balance.service.interface.ts with IBalanceService interface declaring: getEmployeeBalances(employeeId), getEmployeeBalanceForPolicy(employeeId, policyId), initializeBalance(employeeId, policyId, fiscalYear), getBalanceSummary(employeeId, fiscalYear). Create src/modules/balance/balance.service.ts with BalanceService class implementing IBalanceService. Create src/modules/balance/balance.controller.ts with BalanceController validating inputs via Zod and delegating to IBalanceService. Create src/modules/balance/balance.routes.ts registering Fastify routes: GET /balances, GET /balances/:employeeId, GET /balances/:employeeId/summary. Create src/modules/balance/index.ts barrel export. Depends on src/modules/balance/balance.model.ts and src/modules/balance/balance.repository.ts (Phase 4). Register routes in src/app.ts. Include Jest integration tests in tests/integration/modules/balance/balance.routes.spec.ts.

## Phase 10: Phase 10: Audit module — model, repository, and service interface

Create src/modules/audit/audit.model.ts with the AuditRecord interface (id, entityType, entityId, action: 'CREATE'|'UPDATE'|'DELETE'|'APPROVE'|'REJECT', oldValues, newValues, performedBy, performedAt, createdAt, updatedAt). Create src/modules/audit/audit.repository.ts with IAuditRepository interface and KnexAuditRepository class — methods: create, findByEntity, findByPerformer, findByDateRange. Create src/modules/audit/audit.service.interface.ts with IAuditService interface declaring: record(action, entityType, entityId, performedBy, oldValues?, newValues?), getAuditTrail(entityType, entityId). Create src/modules/audit/index.ts barrel export. Depends on src/shared/db/connection.ts. Include Jest unit tests in tests/unit/modules/audit/audit.repository.spec.ts. This module satisfies GP-002 — all state-changing operations in the leave service (Phase 6) will inject IAuditService to write audit records.
