# Architecture — trackeros

## Overview

The architecture is modular, with a clear separation of concerns between models, repositories, services, controllers, and routes. The backend is built using Fastify for performance, while the frontend leverages React Native for mobile and React for web, sharing contracts for type safety.

## Stack

- Runtime: Node 20 LTS
- Package manager: npm
- Test framework: Jest
- Backend: Fastify
- Frontend: React Native
- Database: PostgreSQL

## Module structure

```
src/modules/status/       — Status module (health-check)
src/modules/uptime/       — Uptime module (system status)
src/shared/db/            — Database connection (pg Pool)
src/shared/types/         — Shared type definitions (LeaveType, LeaveStatus enums)
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

<!-- gestalt:architecture feature=659f59c0-5c74-4c65-966e-e5be5ed9ec73 START -->
## Leave Management Module

### Overview
The leave management module enables employees to apply for annual, sick, and emergency leave, managers to approve or reject requests, and the system to track leave balances. It is built as a modular monolith using TypeScript, Fastify, React Native, and PostgreSQL, following the existing architecture and golden principles.

### Implementation Status

**Phase 1 — Shared types: COMPLETE**
- `src/shared/types/leave-type.enum.ts` — `LeaveType` enum (ANNUAL, SICK, EMERGENCY, UNPAID, MATERNITY, PATERNITY)
- `src/shared/types/leave-status.enum.ts` — `LeaveStatus` enum (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED)
- `src/shared/types/index.ts` — Barrel export re-exporting both enums
- Tests: `tests/unit/shared/types/leave-type.enum.test.ts`, `tests/unit/shared/types/leave-status.enum.test.ts`

**Phase 2 — LeavePolicy model and repositories: COMPLETE**
- `src/modules/leave-policy/leave-policy.model.ts` — `LeavePolicy` interface (id, policyName, leaveType, entitlementDays, accrualRate, maxAccumulation, minimumNoticeDays, requiresManagerApproval, isActive, createdAt, updatedAt)
- `src/modules/leave-policy/leave-policy.repository.interface.ts` — `ILeavePolicyRepository` interface (findAll, findById, findByLeaveType, create, update, delete)
- `src/modules/leave-policy/leave-policy.repository.ts` — `PgLeavePolicyRepository` implementation using `pg` Pool from `src/shared/db/connection.ts`; parameterized queries; snake_case column mapping; UUID generation via `crypto.randomUUID()`; dynamic UPDATE with column-map whitelist
- `src/modules/leave-policy/leave-type.repository.interface.ts` — `ILeaveTypeRepository` interface (findAll, findByValue)
- `src/modules/leave-policy/leave-type.repository.ts` — `PgLeaveTypeRepository` implementation querying a `leave_types` table
- Tests: `tests/unit/modules/leave-policy/leave-policy.repository.test.ts`, `tests/unit/modules/leave-policy/leave-type.repository.test.ts` — Jest unit tests with mocked `pool.query`, covering all CRUD paths, null/empty results, and error propagation

**Phases 3–10 — Pending (not yet implemented)**
- Phase 3: LeavePolicy service and routes
- Phase 4–5: LeaveBalance model, repository, service, routes
- Phase 6–7: Audit model, repository, service, routes
- Phase 8–9: LeaveRequest model, repository, service, routes
- Phase 10: Wire all modules into app.ts

### Domain Model (planned)
- **LeaveRequest** — Core aggregate representing a leave application. Lifecycle: DRAFT → SUBMITTED → APPROVED/REJECTED; can be CANCELLED from any non-terminal state. Tracks approver, rejector, and canceller separately for full audit.
- **LeaveType** — Enumeration of leave categories (annual, sick, emergency, plus extensible types).
- **LeavePolicy** — Configuration per leave type: entitlement days, accrual rules, minimum notice, manager approval requirement. Lifecycle: ACTIVE/INACTIVE.
- **LeaveBalance** — Per-employee, per-leave-type, per-fiscal-year balance. Lifecycle: ACTIVE → EXHAUSTED (when remaining=0) → CLOSED (fiscal year end).

Business rules enforced (planned):
- Date validity (start < end)
- No overlapping approved leaves
- Sufficient balance at approval time
- Balance deduction on approval, restoration on cancellation
- Manager approval required (self-approval prohibited)
- Minimum notice period check at submission

### Planned Module Structure
```
src/
├── shared/
│   └── types/          # ✅ LeaveType, LeaveStatus enums (Phase 1 — DONE)
├── modules/
│   ├── audit/          # ⏳ AuditRecord, IAuditService, AuditService, IAuditLogRepository, PgAuditLogRepository, routes
│   ├── leave-policy/   # ✅ LeavePolicy model + repos (Phase 2 — DONE) / ⏳ service + routes (Phase 3)
│   ├── leave-balance/  # ⏳ LeaveBalance, ILeaveBalanceRepository, PgLeaveBalanceRepository, ILeaveBalanceService, LeaveBalanceService, routes
│   └── leave-request/  # ⏳ LeaveRequest, ILeaveRequestRepository, PgLeaveRequestRepository, ILeaveRequestService, LeaveRequestService, routes
```

Dependencies flow inward: routes → services → repositories → db. No circular dependencies. The leave-request module orchestrates the workflow and depends on leave-balance, leave-policy, audit, shared-types, and an external employee module (for IEmployeeRepository).

### Compliance with Golden Principles
- **GP-001 (Repository Pattern)**: All data access through repository interfaces with PostgreSQL implementations.
- **GP-002 (Audit)**: Every state change writes an immutable audit record via IAuditService.
- **GP-003 (Input Validation)**: Validation at route boundaries before service invocation.
- **GP-005 (RBAC)**: Manager-only endpoints (approve, reject, view pending) enforced at route layer; employee endpoints for own requests.
- **GP-006 (Transaction Semantics)**: Balance deduction/credit and status updates occur within database transactions to maintain consistency.
<!-- gestalt:architecture feature=659f59c0-5c74-4c65-966e-e5be5ed9ec73 END -->
