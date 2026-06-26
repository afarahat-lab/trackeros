# Architecture — trackeros

## Overview

The architecture is modular, with a clear separation of concerns between models, repositories, services, controllers, and routes. The backend is built using Fastify for performance, while the frontend leverages React Native for mobile and React for web, sharing contracts for type safety.

## Stack

- Runtime: Node 20 LTS
- Package manager: npm
- Test framework: Vitest
- Backend: Fastify
- Frontend: React Native
- Database: PostgreSQL

## Module structure

```
src/modules/leave/leave.{model,repository,service,controller,routes}.ts
src/modules/balance/balance.{model,repository,service,controller,routes}.ts
src/modules/employee/employee.{model,repository,service,controller,routes}.ts
src/modules/policy/policy.{model,repository,service,controller,routes}.ts
src/modules/notification/notification.{model,repository,service,controller,routes}.ts
src/modules/LeaveStatus/    — LeaveStatus module
src/modules/BaseEntity/    — BaseEntity module
src/modules/LeaveRequest/    — LeaveRequest module
src/modules/LeaveType/    — LeaveType module
src/modules/LeavePolicy/    — LeavePolicy module
src/modules/AuditLog/    — AuditLog module
src/modules/AuditRecord/    — AuditRecord module
src/modules/AuditServiceInterface/    — AuditServiceInterface module
src/shared/db/connection.ts
src/shared/types/index.ts
src/shared/types/leave.types.ts
```

## Key patterns

- See `AGENTS.md` for stack-specific coding conventions
- See `docs/GOLDEN_PRINCIPLES.md` for the non-negotiable rules every
  cycle is checked against

## Dependency rules

- Modules import from each other ONLY through their declared public
  entry point (`index.ts`, `__init__.py`, package root — whatever the
  stack uses)
- All database access goes through a repository layer — no inline SQL
  / ORM calls in route handlers or business logic
- No circular dependencies between modules

## Leave Management Module
This module handles leave requests, approvals, and leave balance tracking for employees.

## Leave Management Module
This module handles leave requests, approvals, and leave balance tracking for employees.

## Leave Management Feature\n\n### Domain entities\n- LeaveRequest: leave applications submitted by employees and processed by managers.\n- LeaveBalance: remaining entitlement by employee and leave type.\n- Employee: employee identity and reporting hierarchy.\n- LeavePolicy: entitlement and leave-type rules.\n- Notification: leave workflow notifications.\n\n### Module ownership\n- src/modules/leave owns leave request workflows and approval state transitions.\n- src/modules/balance owns leave balance storage and adjustments.\n- src/modules/employee owns employee and manager relationship data.\n- src/modules/policy owns leave entitlement rules.\n- src/modules/notification owns leave-related notifications.\n\n### Dependency direction\n- leave -> employee\n- leave -> policy\n- leave -> balance\n- leave -> notification\n\nNo reverse dependencies are introduced, preservi
## Intent
[Feature: Leave Management — Phase 1: Phase 1: Shared Leave Types]

Create src/shared/types/leave.types.ts with TypeScript enums LeaveType (ANNUAL, SICK, EMERGENCY) and LeaveStatus (PENDING, APPROVED, REJECTED, CANCELLED). These are foundational types imported by all leave-related modules. Include Jest unit tests in tests/unit/shared/types/.

Phase architecture notes:
src/shared/types/leave.types.ts

## Deferred to later phases
The following concerns are intentionally OUT OF SCOPE for this phase and will be addressed in subsequent phases:
- Phase 2 — Phase 2: Audit Model and Repository: Create src/modules/audit/audit.model.ts defining the AuditRecord interface with fields: id, entityTy
- Phase 3 — Phase 3: Audit Service: Create src/modules/audit/audit.service.ts implementing AuditService with method recordStateChange(en
- Phase 4 — Phase 4: Leave Model and Repository: Create src/modules/leave/leave.model.ts defining the LeaveRequest interface with fields: id, employe
- Phase 5 — Phase 5: Leave Service: Create src/modules/leave/leave.service.ts implementing LeaveService with methods createLeaveRequest(
- Phase 6 — Phase 6: Leave Routes: Create src/modules/leave/leave.routes.ts with Fastify routes: POST /leave (create request), GET /lea
- Phase 7 — Phase 7: Balance Model and Repository: Create src/modules/balance/balance.model.ts defining the LeaveBalance interface with fields: id, emp
- Phase 8 — Phase 8: Balance Service: Create src/modules/balance/balance.service.ts implementing LeaveBalanceService with methods getEmplo
- Phase 9 — Phase 9: Balance Routes: Create src/modules/balance/balance.routes.ts with Fastify routes: GET /balance (get current user's b
- Phase 10 — Phase 10: Application Integration: Update src/app.ts to register the new leave and balance route modules. Import and register leaveRout
## Intent spec
{"scope":{"affectedDomains":["shared"],"affectedLayers":["domain-types"],"isBreakingChange":false,"estimatedComplexity":"small"},"successCriteria":[{"description":"src/shared/types/leave.types.ts exists and exports a string enum LeaveType with exactly three members: ANNUAL = 'ANNUAL', SICK = 'SICK', EMERGENCY = 'EMERGENCY'","testable":true,"layer":"e2e"},{"description":"src/shared/types/leave.types.ts exports a string enum LeaveStatus with exactly four members: PENDING = 'PENDING', APPROVED = 'APPROVED', REJECTED = 'REJECTED', CANCELLED = 'CANCELLED'","testable":true,"layer":"e2e"},{"description":"tests/unit/shared/types/leave.types.test.ts exists with Jest tests that verify every enum member name and string value, and verify the total member count for each enum (3 for LeaveType, 4 for LeaveStatus)","testable":true,"layer":"e2e"},{"description":"The verification command (npm run build && npx jest --passWithNoTests) passes — TypeScript compiles without errors and all Jest tests pass","testable":true,"layer":"e2e"}],"constraints":["ruleId:no-any","source","rationale","severity","ruleId:no-direct-db-outside-repository","rationale","ruleId:no-hardcoded-secrets","rationale","ruleId:no-gestalt-internal-deps","rationaleale","ruleIdId:strict-typescript","rationaleale","ruleIdId:jest-test-framework","rationaleale","ruleIdId:enum-string-values-match-sql","rationaleale"],"outOfScope":["Modifying src/shared/types/index.ts to re-export from leave.types.ts or to remove its existing duplicate LeaveType/LeaveStatus enum definitions","Any module importing these types (phases 2–10)","Any barrel index.ts file in src/shared/types/","Phase 2 — Audit Model and Repository","Phase 3 — Audit Service","Phase 4 — Leave Model and Repository","Phase 5 — Leave Service","Phase 6 — Leave Routes","Phase 7 — Balance Model and Repository","Phase 8 — Balance Service","Phase 9 — Balance Routes","Phase 10 — Application Integration"],"ambiguities":[]}
## Task
Update the project context files (docs/* + AGENTS.md) so they stay accurate after this intent. Only propose updates for files that actually need to change.