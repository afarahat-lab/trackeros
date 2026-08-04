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

## Module structure (as built)

```
src/
├── shared/
│   ├── db/
│   │   └── connection.ts          # PostgreSQL connection pool (pg Pool)
│   ├── types/
│   │   └── index.ts               # Canonical enums + interfaces (LeaveType, LeaveStatus, EmploymentStatus, AuditAction, BaseEntity, AuthenticatedUser)
│   └── utils/
│       └── business-days.ts       # countBusinessDays(start, end, holidays) — Mon–Fri excluding weekends + supplied holidays, UTC-midnight normalised
├── modules/
│   ├── audit/                     # Audit model + repository + service (Phase 5)
│   │   ├── index.ts               # Barrel: AuditRecord, CreateAuditRecordInput, IAuditRepository, AuditRepository, IAuditService, AuditService
│   │   ├── audit.model.ts         # AuditRecord entity (camelCase interface)
│   │   ├── audit.repository.ts    # IAuditRepository + AuditRepository (parameterised queries, snake→camel mapping, JSON serialisation for oldValues/newValues)
│   │   └── audit.service.ts       # IAuditService + AuditService (record method — generates UUID, delegates to repository, sets performedAt)
│   ├── balance/                   # LeaveBalance model + repository + service (Phase 6)
│   │   ├── index.ts               # Barrel: LeaveBalance, BalanceStatus, IBalanceRepository, BalanceRepository, CreateLeaveBalanceInput, IBalanceService, BalanceService, InsufficientBalanceError
│   │   ├── balance.model.ts       # LeaveBalance entity + BalanceStatus enum (ACTIVE | EXHAUSTED | EXPIRED); remainingDays is computed (totalEntitlement - usedDays) at the repository mapping layer, never stored
│   │   ├── balance.repository.ts  # IBalanceRepository + BalanceRepository (parameterised queries, snake→camel mapping, atomic incrementUsedDays/decrementUsedDays with RETURNING)
│   │   └── balance.service.ts     # IBalanceService + BalanceService (initializeBalance, deductDays with rollback on negative remaining, restoreDays; InsufficientBalanceError custom error)
│   ├── employee/                  # Employee model + repository (Phase 2)
│   │   ├── index.ts               # Barrel: Employee, IEmployeeRepository, EmployeeRepository
│   │   ├── employee.model.ts      # Employee entity (camelCase, standalone — does not extend BaseEntity)
│   │   └── employee.repository.ts # IEmployeeRepository + EmployeeRepository (parameterised queries, soft-delete, snake→camel mapping)
│   ├── leave/                     # LeaveRequest model + repository + validation (Phase 7 — partial)
│   │   ├── leave.model.ts         # LeaveRequest entity, CreateLeaveRequestDto, UpdateLeaveRequestDto, LeaveRequestQueryParams
│   │   ├── leave.repository.ts    # ILeaveRepository + LeaveRepository (parameterised queries, snake→camel mapping, findByEmployee with dynamic filters, findByApprover via JOIN on employees.manager_id, create with DRAFT default status, updateStatus with dynamic SET, update with dynamic SET)
│   │   └── leave.validation.ts    # Zod schemas: createLeaveRequestSchema (ISO date strings, startDate < endDate), updateLeaveRequestSchema (optional fields, cross-field date validation)
│   ├── notification/              # Notification model + repository + service (Phase 4)
│   │   ├── index.ts               # Barrel: Notification, NotificationStatus, CreateNotificationInput, INotificationRepository, NotificationRepository, INotificationService, NotificationService
│   │   ├── notification.model.ts  # Notification entity + NotificationStatus type (PENDING | SENT | READ | ARCHIVED)
│   │   ├── notification.repository.ts # INotificationRepository + NotificationRepository (parameterised queries, snake→camel mapping, create/findByRecipient/markSent/markRead)
│   │   └── notification.service.ts    # INotificationService + NotificationService (notify method — generates UUID, delegates to repository)
│   ├── policy/                    # LeavePolicy model + repository (Phase 3)
│   │   ├── index.ts               # Barrel: LeavePolicy, IPolicyRepository, PolicyRepository
│   │   ├── policy.model.ts        # LeavePolicy entity (camelCase interface)
│   │   └── policy.repository.ts   # IPolicyRepository + PolicyRepository (parameterised queries, snake→camel mapping, dynamic UPDATE)
│   ├── status/                    # System status module (health-check)
│   │   ├── index.ts
│   │   ├── status.model.ts
│   │   ├── status.service.interface.ts
│   │   └── status.service.ts
│   └── uptime/                    # Uptime module (version + health routes)
│       ├── index.ts
│       ├── uptime.model.ts
│       ├── uptime.routes.ts
│       ├── uptime.service.interface.ts
│       └── uptime.service.ts
├── app.ts                         # Fastify app instance + route registration
└── index.ts                       # Entry point (starts server on port 3000)

tests/
├── unit/
│   ├── shared/
│   │   └── business-days.test.ts  # Jest tests for countBusinessDays
│   └── modules/
│       ├── audit/
│       │   └── audit.service.test.ts    # Jest tests for AuditService
│       ├── balance/
│       │   └── balance.service.test.ts  # Jest tests for BalanceService (getBalance, getBalances, initializeBalance, deductDays with rollback, restoreDays)
│       ├── employee/
│       │   └── employee.repository.test.ts  # Jest tests for EmployeeRepository
│       ├── notification/
│       │   └── notification.service.test.ts # Jest tests for NotificationService
│       └── policy/
│           └── policy.repository.test.ts    # Jest tests for PolicyRepository
```

### Planned modules (not yet built)

The following modules are planned per the leave-management feature design but have not been implemented yet:

- `src/modules/leave/` — service layer, controller, routes, barrel (`index.ts`), and tests

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

<!-- gestalt:architecture feature=4fbbfee4-4feb-4a2b-8127-85025f82af24 START -->
## Leave Management Module — Reconciled Architecture

### Overview

The leave management module enables employees to apply for annual, sick, and emergency leave, managers to approve or reject requests, and the system to track leave balances. The architecture follows a modular-monolith style with Fastify (backend), React Native (frontend), PostgreSQL, and TypeScript. All business rules are enforced in the domain layer; persistence is abstracted behind repository interfaces with concrete PostgreSQL implementations.

### Domain Entities

| Entity | Purpose | Lifecycle States |
|--------|---------|------------------|
| **LeaveRequest** | Employee leave application. Tracks from draft to terminal states. | DRAFT → SUBMITTED → APPROVED / REJECTED; APPROVED → CANCELLED; SUBMITTED → CANCELLED |
| **LeavePolicy** | Rules and entitlements for a leave type. | ACTIVE, INACTIVE |
| **LeaveBalance** | Employee's entitlement, usage, and remaining days per policy per fiscal year. | ACTIVE → EXHAUSTED (when remainingDays=0); ACTIVE/EXHAUSTED → EXPIRED (fiscal year end) |
| **Employee** | Organisation member with reporting line and employment status. | ACTIVE, INACTIVE, TERMINATED |
| **Notification** | System notification to employees/managers about leave events. | PENDING → SENT → READ / ARCHIVED |

**Key Business Rules (binding across all layers):**
- Day count = `endDate - startDate + 1` (inclusive calendar days).
- Only ACTIVE employees can submit leave.
- Manager approval is verified via `Employee.managerId`.
- Balance sufficiency checked before approval; atomic deduction on approval, restoration on cancellation.
- Overlap detection: no two APPROVED/SUBMITTED requests with overlapping date ranges.
- Policy `minimumNoticeDays` enforced on submission; `requiresManagerApproval=false` enables auto-approval.

### Database Tables (Conceptual)

| Table | Key Fields | Primary Key | Foreign Keys |
|-------|------------|-------------|--------------|
| `leave_requests` | id, employee_id, leave_type_id, start_date, end_date, reason, status, approved_by, approved_at, created_at, updated_at | id | employee_id → employees.id, leave_type_id → leave_policies.id, approved_by → employees.id |
| `leave_balances` | id, employee_id, policy_id, total_entitlement, used_days, fiscal_year, status, created_at, updated_at | id | employee_id → employees.id, policy_id → leave_policies.id |
| `employees` | id, employee_number, first_name, last_name, email, manager_id, department, hire_date, termination_date, employment_status, created_at, updated_at, deleted_at | id | manager_id → employees.id |
| `leave_policies` | id, policy_name, leave_type, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active, created_at, updated_at | id | — |
| `audit_logs` | id, entity_type, entity_id, action, old_values, new_values, performed_by, performed_at, created_at, updated_at | id | performed_by → employees.id |
| `notifications` | id, recipient_id, type, title, message, related_entity_type, related_entity_id, status, created_at, read_at | id | recipient_id → employees.id |

Indexes are defined for frequent access patterns: employee lookups, status filtering, date-range scans, compound unique constraints, and audit trails.

### Module Boundaries

```
src/
├── shared/
│   ├── types/          # Enums (LeaveType, LeaveStatus, EmploymentStatus, AuditAction), BaseEntity
│   └── db/             # PostgreSQL connection pool (pg Pool)
├── modules/
│   ├── employee/       # Employee CRUD, status checks ✅ built (Phase 2)
│   ├── policy/         # LeavePolicy CRUD, active policy lookups ✅ built (Phase 3)
│   ├── notification/   # Notification creation and retrieval ✅ built (Phase 4)
│   ├── audit/          # Audit trail recording and querying ✅ built (Phase 5)
│   ├── balance/        # LeaveBalance management, deduction/restoration ✅ built (Phase 6)
│   └── leave/          # LeaveRequest model + repository + validation ✅ built (Phase 7); service, controller, routes, barrel, tests still planned
```

**Dependency direction (acyclic):**
- `employee` and `policy` are foundation modules (only depend on shared).
- `balance` depends on `employee` and `policy`.
- `notification` and `audit` are independent mid-layer modules.
- `leave` orchestrates all five downstream modules via constructor injection.

### Build Phases — Status

1. **Shared types + Employee module** — foundation enums and employee vertical slice. ✅ Done
2. **Policy module** — policy vertical slice. ✅ Done
3. **Balance module** — balance vertical slice (depends on employee & policy). ✅ Done
4. **Notification module** — notification vertical slice. ✅ Done
5. **Audit module** — audit vertical slice. ✅ Done
6. **Leave module — model, repository, validation** — LeaveRequest entity, ILeaveRepository + LeaveRepository (findById, findByEmployee with dynamic filters, findByApprover via JOIN, create with DRAFT default, updateStatus with dynamic SET, update with dynamic SET), Zod schemas (createLeaveRequestSchema, updateLeaveRequestSchema with cross-field date validation). ✅ Done (Phase 7)
7. **Leave module — service layer** — ILeaveService + LeaveService (submit, approve, reject, cancel, create, update, findById, findByEmployee with RBAC). Planned
8. **Leave module — controller + routes** — Fastify route plugin, controller with auth stubs. Planned
9. **Leave module — barrel + tests** — `index.ts` barrel export, Jest unit tests for repository and validation. Planned

### Known divergences (Phase 7)

- **No barrel (`index.ts`):** The leave module currently has no barrel export, unlike all other modules. Consumers must import directly from individual files.
- **No tests:** The plan prescribed `tests/unit/modules/leave/leave.repository.test.ts` and `tests/unit/modules/leave/leave.validation.test.ts`; neither was created in this phase.

### Open Questions (Require Stakeholder Decision)

1. **Fiscal year definition** — calendar, configurable, or fixed? Affects balance lifecycle and cross-year leave handling.
2. **Mid-year hire entitlement** — pro-rata, full, or accrual-based?
3. **Cancellation authorization** — employee only, employee/manager, or employee/manager/HR?
4. **Emergency leave special-casing** — standard policy, bypass notice, or auto-approve?
5. **Partial-day rounding** — nearest half-day, ceiling, floor, or exact decimal?

These decisions materially impact balance arithmetic, authorization, and policy enforcement. They must be resolved before implementation reaches the balance and leave modules.
<!-- gestalt:architecture feature=4fbbfee4-4feb-4a2b-8127-85025f82af24 END -->
