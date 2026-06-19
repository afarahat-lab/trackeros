# PLAN.md — Build the leave management module

_Phase plan updated by autonomous phase-split at 2026-06-19T14:30:07.599Z._

## Phases

### Phase 1: Core domain models and repository interfaces [deployed]

Create approximately 8 files: src/modules/leave/leave.model.ts, src/modules/balance/balance.model.ts, src/modules/employee/employee.model.ts, src/modules/policy/policy.model.ts, src/modules/notification/notification.model.ts with TypeScript interfaces for all domain entities (Employee, LeavePolicy, LeaveBalance, LeaveRequest, Notification). Create repository interfaces in src/modules/*/*.repository.ts files referencing these domain models. Use exact canonical names from architecture specification. Include Jest unit tests in tests/unit/modules/*/model.repository.test.ts.

### Phase 2: Create DTO files for Leave and Balance modules [pending]

Create the DTO files for the Leave and Balance modules. These files depend only on the model files from Phase 1 and define the data transfer object interfaces needed by the service interfaces.

### Phase 3: Create DTO files for Employee and Policy modules [pending]

Create the DTO files for the Employee and Policy modules. These files depend only on the model files from Phase 1 and define the data transfer object interfaces needed by the service interfaces.

### Phase 4: Create Service Interface files [pending]

Create the four service interface and implementation class files. These files depend on the DTO files created in the previous sub-phases and on the repository/model imports defined in the architecture.

### Phase 5: Employee and Policy module implementations [pending]

Create approximately 5 files: Implement src/modules/employee/employee.repository.ts and src/modules/policy/policy.repository.ts with concrete repository implementations. Implement src/modules/employee/employee.service.impl.ts and src/modules/policy/policy.service.impl.ts with service implementations. This phase depends on model files from Phase 1 and service interfaces from Phase 2 — read them before generating implementations. Include Jest unit tests in tests/unit/modules/employee/ and tests/unit/modules/policy/.

### Phase 6: Balance module implementation [pending]

Create approximately 4 files: Implement src/modules/balance/balance.repository.ts and src/modules/balance/balance.service.impl.ts. This phase depends on employee and policy model files from Phase 1, balance model from Phase 1, and service interfaces from Phase 2 — read them before generating implementations. Include Jest unit tests in tests/unit/modules/balance/.

### Phase 7: Notification module implementation [pending]

Create approximately 3 files: Implement src/modules/notification/notification.repository.ts and src/modules/notification/notification.service.impl.ts. This phase depends on notification model from Phase 1, notification service interface from Phase 2, and employee model from Phase 1 — read them before generating implementations. Include Jest unit tests in tests/unit/modules/notification/.

### Phase 8: Leave module implementation [pending]

Create approximately 5 files: Implement src/modules/leave/leave.repository.ts and src/modules/leave/leave.service.impl.ts. This phase depends on leave model from Phase 1, leave service interface from Phase 2, and all dependency models (employee, policy, balance, notification) from prior phases — read them before generating implementations. Include Jest unit tests in tests/unit/modules/leave/.

### Phase 9: Controllers and API routes [pending]

Create approximately 4 files: src/modules/leave/leave.controller.ts, src/modules/leave/leave.routes.ts, src/modules/balance/balance.controller.ts, src/modules/balance/balance.routes.ts with Fastify controllers and routes. This phase depends on all service implementations from prior phases — read them before generating controllers. Include Jest integration tests in tests/integration/modules/leave/ and tests/integration/modules/balance/.

### Phase 10: Audit integration and RBAC enforcement [pending]

Create approximately 3 files: Add audit logging decorators in src/shared/decorators/audit.decorator.ts. Implement RBAC middleware in src/shared/middleware/rbac.middleware.ts. Apply audit and RBAC to all controllers from Phase 7. This phase depends on all controller files from Phase 7 — read them before adding decorators and middleware. Include Jest security tests in tests/security/audit-rbac.test.ts.
