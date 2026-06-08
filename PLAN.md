# PLAN.md — Build the leave management module

_Adjusted by phase-evaluator-agent at 2026-06-08T20:31:26.499Z._

## Phases

### Phase 1: Create leave model [deployed]

Create src/modules/leave/leave.model.ts. Define LeaveRequest, CreateLeaveRequestDto, and LeaveBalance. Import LeaveType from src/shared/types/index.ts.

### Phase 2: Create leave repository [pending]
_Adjustment: Only the leave model was created; the repository file is still needed._

Create src/modules/leave/leave.repository.ts. Implement functions to interact with the leave data, using LeaveRequest and LeaveBalance. Include a Jest unit test in tests/unit/leave.repository.test.ts.

### Phase 3: Implement leave service logic [pending]
_Adjustment: The service logic file is still needed as it was not created in this phase._

Create src/modules/leave/leave.service.ts. Develop business logic for applying, approving, and rejecting leave requests. Include a Jest unit test in tests/unit/leave.service.test.ts.

### Phase 4: Create leave routes [pending]
_Adjustment: The routes file is still needed as it was not created in this phase._

Create src/modules/leave/leave.routes.ts. Expose API endpoints for employees to apply for leave and for managers to approve or reject requests. Include a Jest unit test in tests/unit/leave.routes.test.ts.
