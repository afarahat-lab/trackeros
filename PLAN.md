# PLAN.md — Build the leave management module

_Phase plan updated by autonomous phase-split at 2026-06-20T21:10:54.197Z._

## Phases

### Phase 1: Define core service interfaces (leave, balance, employee) [deployed]

Create src/modules/leave/leave.service.interface.ts, src/modules/balance/balance.service.interface.ts, src/modules/employee/employee.service.interface.ts. Define ILeaveService, IBalanceService, IEmployeeService interfaces. Use domain types LeaveRequest, LeaveBalance, Employee from src/shared/types/index.ts (already exists). Each interface declares method signatures for the respective domain operations.

### Phase 2: Define supporting service interfaces (policy, notification, audit) [deployed]

Create src/modules/policy/policy.service.interface.ts, src/modules/notification/notification.service.interface.ts, src/modules/audit/audit.service.interface.ts. Define IPolicyService, INotificationService, IAuditService interfaces. Use domain types LeavePolicy, Notification, AuditRecord from src/shared/types/index.ts (already exists).

### Phase 3: Implement balance and employee services [deployed]

Create src/modules/balance/balance.service.ts and tests/unit/modules/balance/balance.service.test.ts. Implement IBalanceService from src/modules/balance/balance.service.interface.ts (Phase 1). Create src/modules/employee/employee.service.ts and tests/unit/modules/employee/employee.service.test.ts. Implement IEmployeeService from src/modules/employee/employee.service.interface.ts (Phase 1). Use domain entities LeaveBalance, Employee from src/shared/types/index.ts. This phase depends on Phase 1 interfaces.

### Phase 4: Implement policy service [deployed]

Create src/modules/policy/policy.service.ts and tests/unit/modules/policy/policy.service.test.ts. Implement IPolicyService from src/modules/policy/policy.service.interface.ts (Phase 2). Use domain entity LeavePolicy from src/shared/types/index.ts. This phase depends on Phase 2 interface.

### Phase 5: Implement notification and audit services [deployed]

Create src/modules/notification/notification.service.ts and tests/unit/modules/notification/notification.service.test.ts. Implement INotificationService from src/modules/notification/notification.service.interface.ts (Phase 2). Create src/modules/audit/audit.service.ts and tests/unit/modules/audit/audit.service.test.ts. Implement IAuditService from src/modules/audit/audit.service.interface.ts (Phase 2). Use domain entities Notification, AuditRecord from src/shared/types/index.ts. This phase depends on Phase 2 interfaces.

### Phase 6: Implement leave application service [deployed]

Create src/modules/leave/leave.service.ts and tests/unit/modules/leave/leave.service.test.ts. Implement ILeaveService from src/modules/leave/leave.service.interface.ts (Phase 1). Orchestrate leave request lifecycle using IBalanceService, IEmployeeService, IPolicyService, INotificationService, IAuditService (injected via constructor). Use domain entity LeaveRequest from src/shared/types/index.ts. This phase depends on all prior service interfaces and implementations (Phases 1-5).

### Phase 7: Create leave validation schemas [pending]

Create src/modules/leave/leave.validation.ts with Zod schemas for leave request creation, approval, rejection, cancellation, retrieval, and balance lookup.

### Phase 8: Create leave controller [pending]

Create src/modules/leave/leave.controller.ts with the LeaveController class implementing ILeaveController, using ILeaveService from Phase 6.

### Phase 9: Create leave routes [pending]

Create src/modules/leave/leave.routes.ts that registers all leave endpoints on a Fastify instance, applying Zod validation schemas and RBAC middleware.
