# PLAN.md — Build the leave management module

_Adjusted by phase-evaluator-agent at 2026-06-09T17:55:42.117Z._

## Phases

### Phase 1: Create leave model and repository [deployed]

Create src/modules/leave/leave.model.ts defining LeaveRequest and CreateLeaveRequestDto. Create src/modules/leave/leave.repository.ts implementing the repository for LeaveRequest. This phase depends on src/shared/types/index.ts for LeaveType.

**What has been built:**
- `src/modules/leave/leave.model.ts` — `interface LeaveRequest`, `interface CreateLeaveRequestDto`
- `src/modules/leave/leave.repository.ts` — `class LeaveRepository`

### Phase 2: Implement leave service logic [pending]

Create src/modules/leave/leave.service.ts implementing the business logic for handling leave requests, including validation and processing. This phase depends on src/modules/leave/leave.model.ts and src/modules/leave/leave.repository.ts.

### Phase 3: Create leave routes and middleware [pending]

Create src/modules/leave/leave.routes.ts to expose leave request functionality through API endpoints. Include access control middleware. This phase depends on src/modules/leave/leave.service.ts.
