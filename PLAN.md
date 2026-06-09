# PLAN.md — Build the leave management module

_Adjusted by phase-evaluator-agent at 2026-06-09T20:30:20.247Z._

## Phases

### Phase 1: Create leave model and repository [deployed]

Create src/modules/leave/leave.model.ts defining LeaveRequest and CreateLeaveRequestDto. Create src/modules/leave/leave.repository.ts implementing the repository for LeaveRequest. This phase depends on src/shared/types/index.ts for LeaveType.

**What has been built:**
- `src/modules/leave/leave.model.ts` — `interface LeaveRequest`, `interface CreateLeaveRequestDto`
- `src/modules/leave/leave.repository.ts` — `interface ILeaveRepository`, `class LeaveRepository`

### Phase 2: Implement leave service logic [deployed]

Create src/modules/leave/leave.service.ts to implement business logic for handling leave requests, including validation and processing. This phase depends on src/modules/leave/leave.model.ts and src/modules/leave/leave.repository.ts.

**What has been built:**
- `src/modules/leave/leave.service.ts` — `class LeaveService`

### Phase 3: Create leave routes and middleware [pending]

Create src/modules/leave/leave.routes.ts to expose API endpoints for leave management. Implement access control middleware in src/modules/leave/leave.middleware.ts. This phase depends on src/modules/leave/leave.service.ts.
