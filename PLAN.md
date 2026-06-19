# PLAN.md — Build the leave management module

_Phase plan updated by autonomous phase-split at 2026-06-19T00:37:12.084Z._

## Phases

### Phase 1: Core domain models and repository interfaces [deployed]

Create src/modules/leave/leave.model.ts with TypeScript interfaces for LeaveRequest and CreateLeaveRequestDto. Create src/modules/balance/balance.model.ts with LeaveBalance interface. Create src/modules/policy/policy.model.ts with LeavePolicy interface. Create src/modules/notification/notification.model.ts with Notification interface. Import existing shared types from src/shared/types/index.ts. Include Jest unit tests in tests/unit/modules/ for each model.

### Phase 2: Repository implementations for core entities [deployed]

Create src/modules/leave/leave.repository.ts implementing ILeaveRepository referencing LeaveRequest from Phase 1. Create src/modules/balance/balance.repository.ts implementing ILeaveBalanceRepository referencing LeaveBalance from Phase 1. Create src/modules/policy/policy.repository.ts implementing ILeavePolicyRepository referencing LeavePolicy from Phase 1. Create src/modules/notification/notification.repository.ts implementing INotificationRepository referencing Notification from Phase 1. Include Jest unit tests in tests/unit/modules/ for each repository.

### Phase 3: Policy and Balance services [deployed]

Create src/modules/policy/policy.service.ts implementing PolicyService that depends on ILeavePolicyRepository from Phase 2. Create src/modules/balance/balance.service.ts implementing BalanceService that depends on ILeaveBalanceRepository from Phase 2. Include input validation (GP-003) and audit records (GP-002). Include Jest unit tests in tests/unit/modules/policy/ and tests/unit/modules/balance/.

### Phase 4: Leave service skeleton and repository interface [failed]

Create the leave-application.service.ts file with the ILeaveApplicationService interface and the LeaveApplicationService class skeleton (method signatures and constructor). Also create the ILeaveRepository interface stub that the service depends on. This sub-phase establishes the core file and its primary dependency.

### Phase 5: Leave service core logic implementation [failed]

Implement the state-changing methods (createLeaveRequest, submitLeaveRequest, cancelLeaveRequest) in LeaveApplicationService, adding dependencies on PolicyService and BalanceService. Implement audit logging and event publishing stubs. This assumes ILeaveRepository exists from Phase 1, and PolicyService/BalanceService interfaces exist from other phases.

### Phase 6: Leave service unit tests [deployed]

Create comprehensive Vitest unit tests for the LeaveApplicationService, mocking all dependencies (ILeaveRepository, PolicyService, BalanceService, AuditLogger, EventPublisher).

### Phase 7: Create Notification Model and Repository [pending]

Create the Notification interface and the NotificationRepository class implementing INotificationRepository. This establishes the core data structure and data access layer.

### Phase 8: Create Notification Service and Unit Tests [pending]

Create the NotificationService class implementing INotificationService, using the repository and audit logger. Also create its Jest unit test file.

### Phase 9: Leave controllers and API endpoints [pending]

Create src/modules/leave/leave.controller.ts with Fastify controllers for leave management endpoints. Implement RBAC enforcement (GP-005) and error handling (GP-006). Depends on LeaveApplicationService (Phase 4). Create src/modules/leave/leave.routes.ts defining API routes. Include Jest integration tests in tests/integration/modules/leave/.

### Phase 10: Notification integration and final workflow [pending]

Update src/modules/leave/leave.service.ts to integrate NotificationService (Phase 5) for sending notifications on leave events. Update src/modules/notification/notification.service.ts to handle leave-specific notification templates. Create src/modules/notification/notification.controller.ts with notification endpoints. Include Jest integration tests for complete workflow.
