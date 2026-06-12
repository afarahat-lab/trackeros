# PLAN.md — Build the leave management module

_Adjusted by phase-evaluator-agent at 2026-06-12T22:27:32.373Z._

## Phases

### Phase 1: Core leave request entity and repository [deployed]

Create src/modules/leave/leave.model.ts with TypeScript interfaces for LeaveRequest and CreateLeaveRequestDto. Import LeaveType, LeaveStatus from src/shared/types/index.ts which already exists. Create src/modules/leave/leave.repository.ts implementing ILeaveRepository with PostgreSQL queries referencing LeaveRequest and CreateLeaveRequestDto types. Include src/modules/leave/leave.repository.spec.ts with Jest unit tests for repository methods. This phase establishes the foundational LeaveRequest model with basic CRUD operations.

### Phase 2: Leave request service with validation [pending]

Create src/modules/leave/leave.service.ts implementing ILeaveService with business logic for leave request creation, validation against policies, and state transitions (PENDING → APPROVED/REJECTED). This phase depends on src/modules/leave/leave.repository.ts from Phase 1 — read it before generating service code. Include src/modules/leave/leave.service.spec.ts with Jest unit tests. Operations execute atomically within a single transaction including audit logging.

### Phase 3: Leave balance entity and repository [pending]

Create src/modules/balance/balance.model.ts with TypeScript interfaces for LeaveBalance and UpdateLeaveBalanceDto. Create src/modules/balance/balance.repository.ts implementing ILeaveBalanceRepository with PostgreSQL queries. Include src/modules/balance/balance.repository.spec.ts with Jest unit tests. This phase depends on existing shared types from src/shared/types/index.ts.

### Phase 4: Leave balance adjustment service [pending]

Create src/modules/balance/balance.service.ts implementing ILeaveBalanceService to adjust balances when leave is approved/rejected. This phase depends on src/modules/balance/balance.repository.ts from Phase 3 — read it before generating service code. Include src/modules/balance/balance.service.spec.ts with Jest unit tests. Balance updates execute atomically with audit records.

### Phase 5: Manager approval workflow with notifications [pending]

Create src/modules/leave/approval.service.ts implementing IApprovalService with RBAC enforcement for manager approval endpoints. This phase depends on src/modules/leave/leave.service.ts from Phase 2 and src/modules/balance/balance.service.ts from Phase 4 — read both before generating approval service. Create src/modules/notification/notification.model.ts with Notification interface. Approval operations execute atomically across LeaveRequest status update, balance adjustment, and notification creation.

### Phase 6: Leave policy validation and API endpoints [pending]

Create src/modules/policy/policy.repository.ts implementing ILeavePolicyRepository for LeavePolicy entity. Create src/modules/leave/validation.service.ts implementing ILeaveValidationService using policy repository. This phase depends on src/modules/leave/leave.service.ts from Phase 2 — read it before generating validation service. Create src/modules/leave/leave.routes.ts with Fastify API endpoints for leave request submission and approval with input validation and RBAC enforcement.
