# PLAN.md — Build the leave management module

_Adjusted by phase-evaluator-agent at 2026-06-13T11:34:00.722Z._

## Phases

### Phase 1: Phase 1: Core domain models for Leave module [deployed]

Create src/modules/leave/leave.model.ts with TypeScript interfaces for LeaveRequest and CreateLeaveRequestDto. Define all attributes from the architecture specification: id, employeeId, leavePolicyId, startDate, endDate, totalDays, status, reason, managerNotes, approvedBy, approvedAt. Also create src/modules/leave/leave.repository.ts with ILeaveRepository interface defining CRUD methods that reference the LeaveRequest and CreateLeaveRequestDto types. Include basic Jest unit tests in tests/unit/modules/leave/leave.repository.test.ts.

**What has been built:**
- `src/modules/leave/leave.model.ts` — `type LeaveType`, `type LeaveStatus`, `interface LeaveRequest`, `interface CreateLeaveRequestDto`
- `src/modules/leave/leave.repository.ts` — `interface ILeaveRepository`, `class PgLeaveRepository`

### Phase 2: Phase 2: LeavePolicy domain model and repository [pending]
_Adjustment: Phase 1 created leave models but with different attributes than planned. Phase 2 should proceed as planned but note that LeaveRequest interface in Phase 1 doesn't reference leavePolicyId._

Create src/modules/policy/policy.model.ts with LeavePolicy interface containing all attributes from specification. Create src/modules/policy/policy.repository.ts with ILeavePolicyRepository interface. This phase depends on existing shared types from src/shared/types/index.ts. Include Jest tests in tests/unit/modules/policy/policy.repository.test.ts.

### Phase 3: Phase 3: LeaveBalance domain model and repository [pending]
_Adjustment: Phase 1 created leave models but with different attributes than planned. Phase 3 should proceed as planned._

Create src/modules/balance/balance.model.ts with LeaveBalance interface containing all specified attributes. Create src/modules/balance/balance.repository.ts with ILeaveBalanceRepository interface. This phase depends on existing shared types. Include Jest tests in tests/unit/modules/balance/balance.repository.test.ts.

### Phase 4: Phase 4: EmployeeService implementation [pending]
_Adjustment: Phase 1 created leave models but with different attributes than planned. Phase 4 should proceed as planned._

Create src/modules/employee/employee.service.ts implementing IEmployeeService. This service depends on IEmployeeRepository (assumed to exist in src/modules/employee/employee.repository.ts). Include input validation (GP-003) and error handling (GP-006). Create tests in tests/unit/modules/employee/employee.service.test.ts.

### Phase 5: Phase 5: PolicyService implementation [pending]
_Adjustment: Phase 1 created leave models but with different attributes than planned. Phase 5 should proceed as planned._

Create src/modules/policy/policy.service.ts implementing ILeavePolicyService. This service depends on ILeavePolicyRepository from Phase 2. Include validation and error handling. Create tests in tests/unit/modules/policy/policy.service.test.ts. This phase depends on src/modules/policy/policy.repository.ts from Phase 2.

### Phase 6: Phase 6: BalanceService implementation [pending]
_Adjustment: Phase 1 created leave models but with different attributes than planned. Phase 6 should proceed as planned._

Create src/modules/balance/balance.service.ts implementing ILeaveBalanceService. This service depends on ILeaveBalanceRepository from Phase 3 and IEmployeeService from Phase 4. Include validation and error handling. Create tests in tests/unit/modules/balance/balance.service.test.ts. This phase depends on src/modules/balance/balance.repository.ts from Phase 3 and src/modules/employee/employee.service.ts from Phase 4.

### Phase 7: Phase 7: LeaveService core implementation [pending]
_Adjustment: Phase 1 created leave models with different attributes than planned. LeaveService must use the actual LeaveRequest and CreateLeaveRequestDto interfaces from src/modules/leave/leave.model.ts which have leaveType instead of leavePolicyId, and managerId instead of managerNotes/approvedBy._

Create src/modules/leave/leave.service.ts implementing ILeaveService. This service depends on ILeaveRepository from src/modules/leave/leave.repository.ts, IEmployeeService from Phase 4, and ILeavePolicyService from Phase 5. Implement basic CRUD operations with validation. Create tests in tests/unit/modules/leave/leave.service.test.ts. Note: LeaveRequest interface in src/modules/leave/leave.model.ts has attributes: id, employeeId, leaveType, startDate, endDate, status, reason, managerId, createdAt, updatedAt. CreateLeaveRequestDto has: employeeId, leaveType, startDate, endDate, reason?, managerId?.

### Phase 8: Phase 8: LeaveService workflow with audit logging [pending]
_Adjustment: Phase 1 created leave models with different attributes than planned. Approval workflow methods should use managerId field for approval/rejection actions._

Extend src/modules/leave/leave.service.ts from Phase 7 to add approval workflow methods (approve, reject) and comprehensive audit logging via IAuditLogRepository (assumed to exist). Update tests in tests/unit/modules/leave/leave.service.test.ts. This phase depends on the existing leave.service.ts file and assumes IAuditLogRepository exists.

### Phase 9: Phase 9: Leave controllers [pending]
_Adjustment: Phase 1 created leave models with different attributes than planned. Controller should use CreateLeaveRequestDto interface from src/modules/leave/leave.model.ts which has leaveType and managerId fields._

Create src/modules/leave/leave.controller.ts with Fastify controller exposing LeaveService methods as HTTP endpoints. Implement input validation at API boundaries and RBAC checks (GP-005). Create tests in tests/unit/modules/leave/leave.controller.test.ts. This phase depends on src/modules/leave/leave.service.ts from Phase 7/8.

### Phase 10: Phase 10: Leave routes and API registration [pending]
_Adjustment: Phase 1 created leave models with different attributes than planned. Routes should handle the actual LeaveRequest and CreateLeaveRequestDto interfaces._

Create src/modules/leave/leave.routes.ts defining Fastify routes that use the controller from Phase 9. Register routes in the application. Implement redaction of sensitive data in logs (GP-004). Create integration tests in tests/integration/modules/leave/leave.routes.test.ts. This phase depends on src/modules/leave/leave.controller.ts from Phase 9.
