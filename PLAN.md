# PLAN.md

## Phase 1: Phase 1: Shared types — enums, DTOs, and base interfaces

Create `src/shared/types/index.ts` with ALL of the following, using the EXACT names from the architecture's shared-types module:

- **LeaveType enum**: `'annual' | 'sick' | 'emergency' | 'unpaid' | 'maternity' | 'paternity'`
- **LeaveStatus enum** (named LeaveRequestStatus for clarity in code but exported as both): `'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED'`
- **EmploymentStatus enum**: `'ACTIVE' | 'INACTIVE' | 'TERMINATED'`
- **AuditAction enum**: `'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT'`
- **BaseEntity interface**: `{ id: string; createdAt: Date; updatedAt: Date }`
- **CreateLeaveRequestDto**: `{ employeeId: string; policyId: string; startDate: Date; endDate: Date; reason?: string }`
- **UpdateLeaveRequestDto**: `{ startDate?: Date; endDate?: Date; reason?: string }`
- **LeaveRequestQueryParams**: `{ status?: LeaveStatus; policyId?: string; startDateFrom?: Date; startDateTo?: Date; endDateFrom?: Date; endDateTo?: Date; limit?: number; offset?: number }`
- **ValidationResult interface**: `{ isValid: boolean; errors: string[] }`

Also create `src/shared/types/` directory if it does not exist. Include Jest unit tests in `tests/unit/shared/types/` verifying enum values and DTO shapes.

## Phase 2: Phase 2: Employee module — model and repository

Create the employee module at `src/modules/employee/`. This phase depends on `src/shared/types/index.ts` from Phase 1 — read it before generating any code that references EmploymentStatus.

Files to create:
- `src/modules/employee/employee.model.ts` — Define the **Employee** entity with EXACT fields: `id: string`, `firstName: string`, `lastName: string`, `email: string`, `role: string`, `managerId: string | null`, `department: string`, `employmentStatus: EmploymentStatus` (import from `src/shared/types`), `createdAt: Date`, `updatedAt: Date`. Also define **IEmployeeRepository** interface with methods: `findById(id: string): Promise<Employee | null>`, `findByDepartment(department: string): Promise<Employee[]>`, `findAll(): Promise<Employee[]>`, `create(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<Employee>`, `update(id: string, data: Partial<Employee>): Promise<Employee | null>`.
- `src/modules/employee/employee.repository.ts` — Implement **EmployeeRepository** class implementing IEmployeeRepository using the pg pool from `src/shared/db/connection.ts`. Use parameterized queries. Follow the repository pattern from GP-001.
- `src/modules/employee/index.ts` — Barrel export of Employee, IEmployeeRepository, EmployeeRepository.

Include Jest unit tests in `tests/unit/modules/employee/` mocking the db pool.

## Phase 3: Phase 3: Policy module — model and repository

Create the policy module at `src/modules/policy/`. This phase depends on `src/shared/types/index.ts` from Phase 1 — read it before generating any code that references LeaveType.

Files to create:
- `src/modules/policy/policy.model.ts` — Define the **LeavePolicy** entity with EXACT fields: `id: string`, `policyName: string`, `leaveType: LeaveType` (import from `src/shared/types`), `entitlementDays: number`, `accrualRate: number | null`, `maxAccumulation: number | null`, `minimumNoticeDays: number | null`, `requiresManagerApproval: boolean`, `isActive: boolean`, `createdAt: Date`, `updatedAt: Date`. Also define **IPolicyRepository** interface with methods: `findById(id: string): Promise<LeavePolicy | null>`, `findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy[]>`, `findActive(): Promise<LeavePolicy[]>`, `create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>`, `update(id: string, data: Partial<LeavePolicy>): Promise<LeavePolicy | null>`.
- `src/modules/policy/policy.repository.ts` — Implement **PolicyRepository** class implementing IPolicyRepository using the pg pool from `src/shared/db/connection.ts`. Use parameterized queries.
- `src/modules/policy/index.ts` — Barrel export of LeavePolicy, IPolicyRepository, PolicyRepository.

Include Jest unit tests in `tests/unit/modules/policy/` mocking the db pool.

## Phase 4: Phase 4: Leave module — model and repository

Create the leave module at `src/modules/leave/`. This phase depends on:
- `src/shared/types/index.ts` from Phase 1 (for LeaveStatus, CreateLeaveRequestDto, UpdateLeaveRequestDto, LeaveRequestQueryParams)
- `src/modules/employee/employee.model.ts` from Phase 2 (for Employee type reference)
- `src/modules/policy/policy.model.ts` from Phase 3 (for LeavePolicy type reference)

Read all three before generating any code.

Files to create:
- `src/modules/leave/leave.model.ts` — Define the **LeaveRequest** entity with EXACT fields: `id: string`, `employeeId: string`, `policyId: string`, `startDate: Date`, `endDate: Date`, `reason: string | undefined`, `status: LeaveStatus` (import from `src/shared/types`), `approvedBy: string | null`, `approvedAt: Date | null`, `rejectionReason: string | null`, `createdAt: Date`, `updatedAt: Date`. Also define **ILeaveRepository** interface with methods: `findById(id: string): Promise<LeaveRequest | null>`, `findByEmployeeId(employeeId: string, params?: LeaveRequestQueryParams): Promise<LeaveRequest[]>`, `findByStatus(status: LeaveStatus): Promise<LeaveRequest[]>`, `create(data: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveRequest>`, `update(id: string, data: Partial<LeaveRequest>): Promise<LeaveRequest | null>`, `updateStatus(id: string, status: LeaveStatus, approvedBy?: string | null, rejectionReason?: string | null): Promise<LeaveRequest | null>`.
- `src/modules/leave/leave.repository.ts` — Implement **LeaveRepository** class implementing ILeaveRepository using the pg pool from `src/shared/db/connection.ts`. Use parameterized queries. The `updateStatus` method must set `approvedAt` to now when status is APPROVED.
- `src/modules/leave/index.ts` — Barrel export of LeaveRequest, ILeaveRepository, LeaveRepository.

Include Jest unit tests in `tests/unit/modules/leave/` mocking the db pool.

## Phase 5: Phase 5: Balance module — model and repository

Create the balance module at `src/modules/balance/`. This phase depends on:
- `src/shared/types/index.ts` from Phase 1
- `src/modules/employee/employee.model.ts` from Phase 2
- `src/modules/policy/policy.model.ts` from Phase 3

Read all three before generating any code.

Files to create:
- `src/modules/balance/balance.model.ts` — Define the **LeaveBalance** entity with EXACT fields: `id: string`, `employeeId: string`, `policyId: string`, `totalEntitlement: number`, `usedDays: number`, `remainingDays: number` (COMPUTED — see binding rule below), `fiscalYear: number`, `status: BalanceStatus` (define BalanceStatus as `'ACTIVE' | 'EXHAUSTED' | 'EXPIRED'`), `createdAt: Date`, `updatedAt: Date`.

  Also define **IBalanceRepository** interface with methods:
  - `findByEmployeeAndPolicy(employeeId: string, policyId: string, fiscalYear: number): Promise<LeaveBalance | null>`
  - `findByEmployeeId(employeeId: string, fiscalYear?: number): Promise<LeaveBalance[]>`
  - `create(data: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>`
  - `updateUsedDays(id: string, usedDays: number): Promise<LeaveBalance | null>` — atomic update
  - `incrementUsedDays(id: string, days: number): Promise<LeaveBalance | null>` — atomic increment, must fail if remainingDays (totalEntitlement - usedDays) would go below zero
  - `decrementUsedDays(id: string, days: number): Promise<LeaveBalance | null>` — atomic decrement for restore-on-reject/cancel

  **BINDING RULE**: `remainingDays` is COMPUTED/DERIVED, never stored. All consumers compute it as `totalEntitlement - usedDays`. The repository must NOT write remainingDays; it is computed at query time.

- `src/modules/balance/balance.repository.ts` — Implement **BalanceRepository** class implementing IBalanceRepository using the pg pool. The `incrementUsedDays` method must use an atomic SQL UPDATE with a CHECK/WHERE clause ensuring `totalEntitlement - usedDays - :days >= 0`, throwing a specific error if the balance would go negative. The `decrementUsedDays` method must ensure usedDays never goes below 0.
- `src/modules/balance/index.ts` — Barrel export.

Include Jest unit tests in `tests/unit/modules/balance/`.

## Phase 6: Phase 6: Notification module — model and repository

Create the notification module at `src/modules/notification/`. This phase depends on `src/shared/types/index.ts` from Phase 1.

Files to create:
- `src/modules/notification/notification.model.ts` — Define the **Notification** entity with EXACT fields: `id: string`, `recipientId: string`, `type: string`, `title: string`, `message: string`, `relatedEntityType: string | null`, `relatedEntityId: string | null`, `status: NotificationStatus` (define as `'PENDING' | 'SENT' | 'READ' | 'ARCHIVED'`), `createdAt: Date`, `readAt: Date | null`.

  Also define **INotificationRepository** interface with methods:
  - `findByRecipientId(recipientId: string): Promise<Notification[]>`
  - `create(data: Omit<Notification, 'id' | 'createdAt' | 'readAt'>): Promise<Notification>`
  - `markAsRead(id: string): Promise<Notification | null>`
  - `updateStatus(id: string, status: NotificationStatus): Promise<Notification | null>`

- `src/modules/notification/notification.repository.ts` — Implement **NotificationRepository** class implementing INotificationRepository using the pg pool from `src/shared/db/connection.ts`.
- `src/modules/notification/index.ts` — Barrel export.

Include Jest unit tests in `tests/unit/modules/notification/`.

## Phase 7: Phase 7: Audit module — model and repository

Create the audit module at `src/modules/audit/`. This phase depends on `src/shared/types/index.ts` from Phase 1 — read it before generating any code that references AuditAction.

Files to create:
- `src/modules/audit/audit.model.ts` — Define the **AuditLog** entity with EXACT fields: `id: string`, `entityType: string`, `entityId: string`, `action: AuditAction` (import from `src/shared/types`), `oldValues: Record<string, unknown> | null`, `newValues: Record<string, unknown> | null`, `performedBy: string`, `performedAt: Date`.

  Also define **IAuditRepository** interface with methods:
  - `findByEntity(entityType: string, entityId: string): Promise<AuditLog[]>`
  - `findByPerformer(performedBy: string): Promise<AuditLog[]>`
  - `create(data: Omit<AuditLog, 'id'>): Promise<AuditLog>`

- `src/modules/audit/audit.repository.ts` — Implement **AuditRepository** class implementing IAuditRepository using the pg pool from `src/shared/db/connection.ts`.
- `src/modules/audit/index.ts` — Barrel export.

Include Jest unit tests in `tests/unit/modules/audit/`.

## Phase 8: Phase 8: Shared day-count utility

Create a shared business-day calculation utility. This phase depends on `src/shared/types/index.ts` from Phase 1 and `src/shared/db/connection.ts` (existing).

Files to create:
- `src/shared/utils/day-count.ts` — Implement a single shared function `calculateBusinessDays(startDate: Date, endDate: Date, holidays: Date[]): number` that counts BUSINESS DAYS ONLY, excluding weekends (Saturday/Sunday) AND public holidays. Whole days only — no half-day support. This function is the single source of truth for all day-count calculations (balance sufficiency check, deduction, restoration).

  Also export `getHolidaysForYear(year: number): Promise<Date[]>` which queries a `holidays` table via the pg pool. The holidays table has columns: `date: Date`, `name: string`, `country: string` (default `'US'`).

- `src/shared/utils/index.ts` — Barrel export.

Include Jest unit tests in `tests/unit/shared/utils/` covering: weekends excluded, holidays excluded, same-day = 1 day, multi-day spans, edge cases.

**BINDING RULE**: This utility must be used by every call site that computes leave day counts — balance sufficiency check, deduction, and restoration — so all computations are identical.

## Phase 9: Phase 9: Leave service — core business logic

Create the leave service implementing all core business logic. This phase depends on ALL prior phases — read these files before generating any code:
- `src/shared/types/index.ts` (Phase 1)
- `src/modules/employee/employee.model.ts` (Phase 2)
- `src/modules/policy/policy.model.ts` (Phase 3)
- `src/modules/leave/leave.model.ts` (Phase 4)
- `src/modules/balance/balance.model.ts` (Phase 5)
- `src/modules/notification/notification.model.ts` (Phase 6)
- `src/modules/audit/audit.model.ts` (Phase 7)
- `src/shared/utils/day-count.ts` (Phase 8)

Files to create:
- `src/modules/leave/leave.service.interface.ts` — Define **ILeaveService** interface with methods:
  - `submitLeaveRequest(dto: CreateLeaveRequestDto): Promise<LeaveRequest>` — validates, checks balance, deducts, creates request, audits, notifies
  - `approveLeaveRequest(requestId: string, approverId: string): Promise<LeaveRequest>` — approves, audits, notifies employee
  - `rejectLeaveRequest(requestId: string, approverId: string, reason: string): Promise<LeaveRequest>` — rejects, restores balance, audits, notifies employee
  - `cancelLeaveRequest(requestId: string, employeeId: string): Promise<LeaveRequest>` — cancels, restores balance, audits
  - `getLeaveRequest(requestId: string): Promise<LeaveRequest | null>`
  - `getEmployeeLeaveRequests(employeeId: string, params?: LeaveRequestQueryParams): Promise<LeaveRequest[]>`

- `src/modules/leave/leave.service.ts` — Implement **LeaveService** class implementing ILeaveService. Constructor takes: ILeaveRepository, IBalanceRepository, IEmployeeRepository, IPolicyRepository, INotificationRepository, IAuditRepository.

  **submitLeaveRequest** logic:
  1. Look up employee; if employmentStatus is not ACTIVE, throw error.
  2. Look up policy by policyId; if not active, throw error.
  3. Compute fiscalYear = calendar year of startDate.
  4. Get or create LeaveBalance for (employeeId, policyId, fiscalYear). If creating, set totalEntitlement = policy.entitlementDays, usedDays = 0.
  5. Fetch holidays for the year via `getHolidaysForYear(fiscalYear)`.
  6. Compute requestedDays = `calculateBusinessDays(startDate, endDate, holidays)`.
  7. Check sufficiency: `balance.totalEntitlement - balance.usedDays >= requestedDays`. If not, throw error.
  8. Atomically increment usedDays by requestedDays via `balanceRepository.incrementUsedDays`.
  9. Create LeaveRequest with status SUBMITTED.
  10. Create AuditLog with action CREATE.
  11. Determine approver: if employee.managerId is not null, notify manager; if null, notify HR admin role (hardcoded role check for now — find employees with role 'hr_admin').
  12. Create Notification for approver.
  13. Return the created LeaveRequest.

  **approveLeaveRequest** logic:
  1. Find request; must be SUBMITTED.
  2. Update status to APPROVED, set approvedBy=approverId, approvedAt=now.
  3. Create AuditLog with action APPROVE.
  4. Notify employee.
  5. Return updated request.

  **rejectLeaveRequest** logic:
  1. Find request; must be SUBMITTED.
  2. Update status to REJECTED, set rejectionReason.
  3. Restore balance: decrement usedDays by the business-day count of the request's date range.
  4. Create AuditLog with action REJECT.
  5. Notify employee.
  6. Return updated request.

  **cancelLeaveRequest** logic:
  1. Find request; must be SUBMITTED or APPROVED; employeeId must match.
  2. Update status to CANCELLED.
  3. Restore balance: decrement usedDays by the business-day count.
  4. Create AuditLog with action UPDATE.
  5. Return updated request.

  **BINDING RULES applied**: Deduct-on-submission (increment usedDays at SUBMIT), restore-on-reject/cancel (decrement usedDays). Approval does NOT change usedDays again. No-manager escalates to HR admin. Business days only via shared utility. remainingDays is computed, never stored.

Include Jest unit tests in `tests/unit/modules/leave/leave.service.spec.ts` mocking all repository dependencies.

## Phase 10: Phase 10: Leave controller, routes, and app registration

Create the HTTP layer for the leave module and register it in the Fastify app. This phase depends on ALL prior phases — read these files before generating:
- `src/modules/leave/leave.service.ts` and `src/modules/leave/leave.service.interface.ts` (Phase 9)
- `src/modules/leave/leave.repository.ts` (Phase 4)
- `src/modules/balance/balance.repository.ts` (Phase 5)
- `src/modules/employee/employee.repository.ts` (Phase 2)
- `src/modules/policy/policy.repository.ts` (Phase 3)
- `src/modules/notification/notification.repository.ts` (Phase 6)
- `src/modules/audit/audit.repository.ts` (Phase 7)
- `src/shared/utils/day-count.ts` (Phase 8)
- `src/app.ts` (existing — must be modified)

Files to create/modify (approximately 3 files):

- `src/modules/leave/leave.controller.ts` — **LeaveController** class that wraps ILeaveService. Methods:
  - `submit(request: FastifyRequest, reply: FastifyReply)` — parse body as CreateLeaveRequestDto, validate required fields (GP-003), call service.submitLeaveRequest, return 201.
  - `approve(request: FastifyRequest, reply: FastifyReply)` — extract requestId from params, approverId from auth context (request.user.id placeholder), call service.approveLeaveRequest, return 200.
  - `reject(request: FastifyRequest, reply: FastifyReply)` — extract requestId, approverId, reason from body, call service.rejectLeaveRequest, return 200.
  - `cancel(request: FastifyRequest, reply: FastifyReply)` — extract requestId from params, employeeId from auth context, call service.cancelLeaveRequest, return 200.
  - `getById(request: FastifyRequest, reply: FastifyReply)` — extract requestId, call service.getLeaveRequest, return 200 or 404.
  - `getByEmployee(request: FastifyRequest, reply: FastifyReply)` — extract employeeId from params, parse query as LeaveRequestQueryParams, call service.getEmployeeLeaveRequests, return 200.

- `src/modules/leave/leave.routes.ts` — Export an async function `leaveRoutes(fastify: FastifyInstance)` that registers routes:
  - `POST /api/leave/requests` → controller.submit
  - `GET /api/leave/requests/:requestId` → controller.getById
  - `GET /api/leave/employees/:employeeId/requests` → controller.getByEmployee
  - `POST /api/leave/requests/:requestId/approve` → controller.approve
  - `POST /api/leave/requests/:requestId/reject` → controller.reject
  - `POST /api/leave/requests/:requestId/cancel` → controller.cancel

  The routes function must instantiate all repositories and the LeaveService with proper wiring.

- `src/app.ts` — MODIFY the existing file to register `leaveRoutes` alongside the existing `uptimeRoutes`. Import `leaveRoutes` from `./modules/leave/leave.routes` and call `app.register(leaveRoutes)`.

Include Jest integration tests in `tests/integration/modules/leave/` using Fastify's inject method.

**GP-003**: Validate all inputs at API boundaries. **GP-005**: RBAC enforcement — at minimum, check that the authenticated user matches the employeeId for cancel operations, and that approvers have manager or hr_admin role.
