# PLAN.md — Build the leave management module

_Adjusted by phase-evaluator-agent at 2026-06-11T18:41:17.443Z._

## Phases

### Phase 1: Create LeaveRequest domain model and repository contracts [deployed]

Create approximately 3-5 files: src/modules/leave/leave.model.ts defining LeaveRequest and submission DTO/types using the canonical LeaveRequest attributes (id, employeeId, leaveType, status); src/modules/leave/leave.repository.ts defining repository interfaces and PostgreSQL-facing contracts that operate on LeaveRequest types from src/modules/leave/leave.model.ts; include a unit test file under tests/unit/modules/leave/ validating model and repository contract behavior. Keep this phase limited to type definitions and repository contracts.

**What has been built:**
- `src/modules/leave/leave.model.ts` — `const LeaveType`, `type LeaveType`, `const LeaveRequestStatus`, `type LeaveRequestStatus`, `interface LeaveRequest`, `interface SubmitLeaveRequestDto`
- `src/modules/leave/leave.repository.ts` — `interface LeaveRequestRepository`, `class PgLeaveRequestRepository`
- `tests/unit/modules/leave/leave.contracts.test.ts`
- `tests/unit/modules/leave/leave.model.test.ts`
- `tests/unit/modules/leave/leave.repository.contract.spec.ts`
- `tests/unit/modules/leave/leave.repository.test.ts`
- `jest.config.js`
- `tests/unit/config/architecture.documentation.test.ts`
- `tests/unit/config/architecture.test.ts`

### Phase 2: Create AuditRecord domain model and repository contracts [pending]

Create approximately 3-5 files: src/modules/audit/audit.model.ts defining AuditRecord with canonical attributes (id, entityType, entityId, action); src/modules/audit/audit.repository.ts defining repository interfaces and PostgreSQL-facing contracts that operate on AuditRecord types from src/modules/audit/audit.model.ts; include a unit test file under tests/unit/modules/audit/. Keep this phase limited to audit persistence contracts.

### Phase 3: Implement leave request submission service [pending]

Create approximately 2-5 files centered on service logic, including src/modules/leave/leave.service.ts. This phase depends on src/modules/leave/leave.model.ts, src/modules/leave/leave.repository.ts, src/modules/audit/audit.model.ts, and src/modules/audit/audit.repository.ts from prior phases — read them before generating code. Implement submitLeaveRequest(employeeId, leaveType) that creates a LeaveRequest in PENDING status and creates an AuditRecord atomically through repository transaction abstractions. Include unit tests under tests/unit/modules/leave/.

### Phase 4: Expose leave submission API with RBAC validation [pending]

Create approximately 2-5 files for API delivery, including a Fastify route/controller file under src/modules/leave/. This phase depends on src/modules/leave/leave.model.ts and src/modules/leave/leave.service.ts from prior phases — read them before generating code. Add request validation, employee-role RBAC enforcement for submission, and invoke submitLeaveRequest. Include API-focused tests.

### Phase 5: Create Employee domain model and repository contracts [pending]

Create approximately 3-5 files: src/modules/employee/employee.model.ts defining Employee with canonical attributes (id, managerId, role); src/modules/employee/employee.repository.ts defining repository interfaces and PostgreSQL-facing contracts using Employee types from src/modules/employee/employee.model.ts; include unit tests under tests/unit/modules/employee/. Keep scope limited to employee lookup and reporting-relationship contracts.

### Phase 6: Implement manager approval and rejection service [pending]

Create approximately 2-5 files centered on workflow logic, including updates to or creation of service files under src/modules/leave/. This phase depends on src/modules/leave/leave.model.ts, src/modules/leave/leave.repository.ts, src/modules/audit/audit.model.ts, src/modules/audit/audit.repository.ts, src/modules/employee/employee.model.ts, and src/modules/employee/employee.repository.ts from prior phases — read them before generating code. Implement approveLeaveRequest(requestId, managerId) and rejectLeaveRequest(requestId, managerId), enforce manager RBAC and reporting relationship validation, and create AuditRecord entries atomically with status transitions. Include unit tests.

### Phase 7: Create LeaveBalance and LeavePolicy domain models with repositories [pending]

Create approximately 4-5 files: src/modules/balance/leave-balance.model.ts defining LeaveBalance with canonical attributes (employeeId, leaveType, remainingDays); src/modules/balance/leave-balance.repository.ts operating on LeaveBalance types from that model file; src/modules/policy/leave-policy.model.ts defining LeavePolicy with canonical attributes (id, leaveType, annualEntitlement); and src/modules/policy/leave-policy.repository.ts operating on LeavePolicy types from that model file. Include unit tests. Keep model and repository pairs in the same phase.

### Phase 8: Implement leave balance management on approval [pending]

Create approximately 2-5 files centered on balance logic, including a service under src/modules/balance/. This phase depends on src/modules/balance/leave-balance.model.ts, src/modules/balance/leave-balance.repository.ts, src/modules/policy/leave-policy.model.ts, src/modules/policy/leave-policy.repository.ts, src/modules/leave/leave.model.ts, src/modules/leave/leave.repository.ts, src/modules/audit/audit.model.ts, and src/modules/audit/audit.repository.ts from prior phases — read them before generating code. Deduct LeaveBalance according to LeavePolicy rules when a LeaveRequest is approved and ensure leave status update, balance update, and AuditRecord creation occur atomically. Include unit tests.

### Phase 9: Create Notification domain model and repository contracts [pending]

Create approximately 3-5 files: src/modules/notification/notification.model.ts defining Notification with canonical attributes (id, recipientEmployeeId, type, status); src/modules/notification/notification.repository.ts defining repository interfaces and PostgreSQL-facing contracts using Notification types from src/modules/notification/notification.model.ts; include unit tests under tests/unit/modules/notification/.

### Phase 10: Implement workflow notification processing [pending]

Create approximately 2-5 files centered on notification services. This phase depends on src/modules/notification/notification.model.ts, src/modules/notification/notification.repository.ts, src/modules/audit/audit.model.ts, src/modules/audit/audit.repository.ts, and existing leave workflow files including src/modules/leave/leave.service.ts — read them before generating code. Generate Notification records for submission, approval, and rejection events; create AuditRecord entries atomically within notification operations; implement compensating retry behavior so notification failures do not roll back already committed leave workflow transactions. Include unit tests.
