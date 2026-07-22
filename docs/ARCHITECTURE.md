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
src/modules/leave/leave.{model,validation,repository,service,controller,routes}.ts
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
src/shared/db connection.ts
src/shared/base repository.ts
src/shared/error types.ts
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

<!-- gestalt:architecture feature=c243fe87-8f44-48cb-bfdd-495fbcb59c13 START -->
## Leave Management Module

### Overview
The leave management feature enables employees to apply for annual, sick, emergency, and other leave types. Managers approve or reject requests. The system tracks leave balances per employee per policy per fiscal year, enforces business rules (eligibility, overlap, balance sufficiency, notice periods), and maintains a full audit trail.

### Domain Model

**Core Entities**
- **LeaveRequest** — the central aggregate representing a leave application. Lifecycle: `DRAFT → SUBMITTED → (APPROVED | REJECTED | CANCELLED)`. DRAFT and SUBMITTED can also transition directly to CANCELLED. Terminal states: APPROVED, REJECTED, CANCELLED.
- **LeaveBalance** — tracks entitlement, used, and remaining days for an employee per policy per fiscal year. Lifecycle: `ACTIVE → EXHAUSTED` (when remaining reaches 0), `ACTIVE → FROZEN` (administrative hold), reversible.
- **LeavePolicy** — defines rules for a leave type (entitlement, accrual, notice, approval requirement, etc.). Lifecycle: `ACTIVE → INACTIVE → ARCHIVED`.
- **Employee** — the actor and subject. Lifecycle: `ACTIVE → INACTIVE → TERMINATED`. Manager relationship (`managerId`) drives the approval hierarchy.
- **Notification** — triggered on leave lifecycle events (submitted, approved, rejected, cancelled, balance thresholds). Lifecycle: `PENDING → SENT → READ → ARCHIVED`.
- **AuditRecord** — immutable log of every state transition on LeaveRequest and every mutation on LeaveBalance (GP-002).

**Enums**
- `LeaveRequestStatus`: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED
- `LeaveType`: ANNUAL, SICK, EMERGENCY, UNPAID, MATERNITY, PATERNITY

**Key Business Rules**
- Only ACTIVE employees may submit leave (BR-001).
- Date validity: start ≤ end, no past start on submission, same fiscal year (BR-002).
- Balance sufficiency checked on approval; negative balance allowed only if policy permits (BR-003).
- Balance deducted on APPROVED, restored on CANCELLED (BR-004, BR-005).
- Manager approval required unless policy says otherwise; auto-approve when `requiresManagerApproval = false` (BR-006).
- Minimum notice enforced except for EMERGENCY type (BR-007).
- Maximum consecutive days enforced (BR-008).
- No overlapping SUBMITTED/APPROVED requests for same leave type (BR-009).
- State transitions authorized by role: employee, manager, or admin (BR-010).
- Every state change produces an AuditRecord (BR-011).
- Cross-fiscal-year requests are rejected (BR-012).

### Module Boundaries & Dependencies

```
leave ──────────────► employee
leave ──────────────► policy
leave ──────────────► balance
leave ──────────────► audit
leave ──────────────► notification
balance ────────────► employee
balance ────────────► policy
balance ────────────► audit
employee ───────────► audit
policy ─────────────► audit
notification ───────► audit
```

- **audit** — zero dependencies; provides `IAuditService` consumed by all other modules.
- **employee** — depends on audit; provides employee identity, manager lookup, and active-status checks.
- **policy** — depends on audit; provides leave policy rules and validation.
- **balance** — depends on employee, policy, audit; manages leave balances, deduction, restoration, and sufficiency checks.
- **notification** — depends on audit; creates and delivers notifications for leave events.
- **leave** — orchestrator; depends on all others. Implements the full request lifecycle: submit, approve, reject, cancel. Enforces all business rules, writes audit records, and triggers notifications.

### Persistence (Conceptual)

All tables are PostgreSQL, accessed through repository interfaces with concrete `Pg*Repository` implementations using the shared `pg Pool` at `src/shared/db/connection.ts`.

- **employee** — core identity table; soft-delete via `deleted_at`.
- **leave_policy** — one row per leave type configuration; `leave_type` is unique.
- **leave_balance** — composite unique on `(employee_id, policy_id, fiscal_year)`; `remaining_days` is stored for performance but derived from `total_entitlement - used_days`.
- **leave_request** — references employee (applicant, approver, rejecter, canceller) and leave_policy via `leave_type_id`; `days_requested` is stored for convenience.
- **audit_log** — immutable; `changes` stores JSON diff of old/new values.
- **notification** — supports inbox queries by recipient and status.

### Phased Build Order

1. **Audit + Shared Infrastructure** — foundation for all modules.
2. **Employee + Policy** — independent, can be parallelized.
3. **Balance** — depends on Employee and Policy.
4. **Notification** — depends only on Audit; can run in parallel with Balance.
5. **Leave** — final orchestrator; integrates all modules.

### Stack Compliance
- Language: TypeScript (Node 20)
- Framework: Fastify (routes/controllers in leave module)
- Database: PostgreSQL via `pg`
- Architecture: modular monolith with strict inward dependency flow
- Testing: Jest
- Cross-cutting: GP-001 (repository pattern), GP-002 (audit), GP-005 (RBAC at controller layer)

### Reconciliation Decisions
- **Naming**: `leaveTypeId` in LeaveRequest is a FK to `leave_policy.id`, not the enum value. `LeavePolicy.leaveType` holds the enum. `LeaveBalance.policyId` references the policy, not the raw type.
- **Missing notification table**: Added to persistence layer to match the Notification domain entity.
- **AuditRecord entity**: Explicitly added to domain model to satisfy BR-011 and GP-002.
- **Employee fields**: Added `employee_number`, `hire_date`, `termination_date`, `employment_status`, `deleted_at` to align domain and data designs.
- **LeavePolicy fields**: Added `accrual_rate`, `max_accumulation` to match domain.
- **LeaveRequest fields**: Added `days_requested`, separate actor columns (`approved_by`, `rejected_by`, `cancelled_by`) instead of a single `reviewer_id`.
- **LeaveBalance fields**: Added `policy_id` FK, `remaining_days`, `status`.
<!-- gestalt:architecture feature=c243fe87-8f44-48cb-bfdd-495fbcb59c13 END -->
