tory`, `IAuditService`\n   - RBAC enforcement:\n     - `approveLeaveRequest`/`rejectLeaveRequest`: only allowed if user.role === 'manager' AND user is the manager of the requesting employee (check via employeeRepo)\n     - `cancelLeaveRequest`: allowed for owning employee (user.id === request.employeeId) OR their manager\n     - `discardDraftLeaveRequest`: only for owning employee when status is 'draft'\n     - `submitLeaveRequest`: only for owning employee when status is 'draft'\n   - `getLeaveBalance`: if role is 'employee', only return own balances (user.id must equal employeeId); if role is 'manager', verify employee is in their team via employeeRepo\n   - `getLeaveHistory`: if role is 'employee', force filters.employeeId = user.id; if role is 'manager', verify they manage the filtered employee\n   - All state-changing methods (approve, reject, cancel, submit) call `auditService.log()` with entity type 'LeaveRequest', entity id, changedBy (user.id), old status, new status\n   - `approveLeaveRequest` and `rejectLeaveRequest` wrap the status update and audit log in a database transaction using `pool` (BEGIN/COMMIT/ROLLBACK pattern)\n   - Throw descriptive errors for RBAC violations (e.g., 'Forbidden: only managers can approve leave requests', 'Forbidden: you are not the manager of this employee')\n\nUse the exact imports specified:\n- `import { ILeaveManagementService, UserContext, LeaveRequestFilters } from './leave-management.service.interface';`\n- `import { IAuditService } from '../../shared/audit/audit.service.interface';`\n- `import { ILeaveRepository } from '../leave/leave.repository';`\n- `import { IBalanceRepository } from '../balance/balance.repository';`\n- `import { ILeaveTypeRepository } from '../leave-type/leave-type.repository';`\n- `import { ILeavePolicyRepository } from '../policy/policy.repository';`\n- `import { IEmployeeRepository } from '../employee/employee.repository';`\n- `import { pool } from '../../shared/db/connection';`\n- `import { CreateLeaveRequestDto, LeaveRequest } from '../leave/leave.model';`\n- `import { LeaveBalance } from '../balance/balance.model';`",
  "extraFlags": [],
  "done": false,
  "reasoning": "Starting with the interface and service implementation files. I need to read the existing dependency files first to understand the repository interfaces, models, and audit service interface so the implementation is consistent. Using architect format for this complex multi-file change."
}
```

## Iteration 2 decision
```json
{
  "editFormat": "diff",
  "readPaths": [
    "src/modules/leave/leave.repository.ts",
    "src/modules/balance/balance.repository.ts",
    "src/modules/leave-management/leave-management.service.ts",
    "src/modules/leave-management/leave-management.service.test.ts"
  ],
  "filePaths": [
    "src/modules/leave-management/leave-management.service.interface.ts",
    "src/modules/leave-management/leave-management.service.ts",
    "src/modules/leave-management/leave-management.service.test.ts"
  ],
  "message": "Fix the build errors in the leave-management module:\n\n1. The interface file `src/modules/leave-management/leave-management.service.interface.ts` was NOT written. Create it now with:\n   - `UserContext` interface: `{ id: string; role: string; }`\n   - `LeaveRequestFilters` interface: `{ employeeId?: string; status?: string; startDate?: string; endDate?: string; }`\n   - `ILeaveManagementService` interface with all 8 methods as specified.\n\n2. Fix imports in `src/modules/leave-management/leave-management.service.ts`:\n   - The leave repository does NOT export `ILeaveRepository`. Read the actual file and use the correct exported interface name.\n   - The balance repository does NOT export `IBalanceRepository` — it exports `ILeaveBalanceRepository`. Fix this import and all usages throughout the service class.\n   - Update all references to these interfaces in the constructor and method bodies.\n\n3. Fix `src/modules/leave-management/leave-management.service.test.ts`:\n   - Line 50: The constructor call passes 8 arguments but the service expects 6-7. Read the actual service constructor signature and fix the test to pass the correct number of arguments in the correct order.\n   - Ensure all mock types match the actual repository interface names.\n\nRead the actual repository files to discover the correct interface names before making changes.",
  "extraFlags": [],
  "done": false,
  "reasoning": "Verification failed with 3 TypeScript errors: wrong interface names for repositories (ILeaveRepository doesn't exist, IBalanceRepository should be ILeaveBalanceRepository), and the test file has a constructor argument count mismatch. The interface file also wasn't written. Switching to diff format for precise fixes, and reading the actual repository files to discover correct names."
}
```

## Iteration 3 decision
```json
{
  "editFormat": "diff",
  "readPaths": [
    "src/modules/leave-management/leave-management.service.ts",
    "src/modules/leave-management/leave-management.service.test.ts",
    "src/modules/leave-management/leave-management.service.interface.ts",
    "src/modules/leave/leave.model.ts",
    "src/modules/balance/balance.model.ts",
    "src/modules/leave/leave.repository.ts",
    "src/modules/balance/balance.repository.ts",
    "src/modules/policy/policy.repository.ts",
    "src/shared/audit/audit.service.interface.ts"
  ],
  "filePaths": [
    "src/modules/leave-management/leave-management.service.ts"
  ],
  "message": "The build passes but tests fail because `createLeaveRequest` resolves to `undefined` instead of throwing errors. The service implementation is missing core business logic.\n\nFix `src/modules/leave-management/leave-management.service.ts` — specifically the `createLeaveRequest` method must:\n\n1. Validate that `endDate` is after `startDate` — throw `ValidationError` if not.\n2. Look up the leave policy via `policyRepo.findByLeaveTypeId(dto.leaveTypeId)` — throw `NotFoundError` if null.\n3. Look up the leave balance via `balanceRepo.findByEmployeeIdAndLeaveTypeIdAndYear(dto.employeeId, dto.leaveTypeId, year)` — throw `NotFoundError` if null.\n4. Calculate days between startDate and endDate. If `balance.pendingDays + balance.usedDays` minus `days` would go below 0 (i.e., insufficient balance), throw `InsufficientBalanceError`.\n5. Create the leave request via `leaveRepo.create(...)` with status 'draft'.\n6. Update balance pendingDays.\n7. Log audit via `auditService.log(...)`.\n8. Return the created request.\n\nAlso ensure ALL other methods (`submitLeaveRequest`, `approveLeaveRequest`, `rejectLeaveRequest`, `cancelLeaveRequest`, `discardDraftLeaveRequest`, `getLeaveBalance`, `getLeaveHistory`) have complete implementations — not stubs that return undefined.\n\nRead the test file carefully to understand exactly what each method must do and what errors it must throw. Match the implementation to the test expectations. Import any needed error classes (ValidationError, NotFoundError, InsufficientBalanceError, ForbiddenError, BadRequestError) from the appropriate location — check existing imports in the file or the project's error module.",
  "extraFlags": [],
  "done": false,
  "reasoning": "Build passes but tests fail because createLeaveRequest and likely other methods are stubs returning undefined instead of implementing business logic. Need to read the test file to understand expectations, then fix the service implementation with proper validation, policy lookup, balance checks, and error throwing."
}
```

## Iteration 4 decision
```json
{
  "editFormat": "diff",
  "readPaths": [
    "src/modules/leave-management/leave-management.service.test.ts",
    "src/modules/leave-management/leave-management.service.ts",
    "src/modules/policy/policy.repository.ts",
    "src/modules/leave/leave.repository.ts",
    "src/modules/balance/balance.repository.ts",
    "src/modules/employee/employee.repository.ts",
    "src/shared/audit/audit.service.interface.ts"
  ],
  "filePaths": [
    "src/modules/leave-management/leave-management.service.ts",
    "src/modules/leave-management/leave-management.service.test.ts"
  ],
  "message": "Tests fail with `this.policyRepo.findByLeaveTypeId is not a function`. The mock in the test file doesn't match the method name the service calls.\n\n1. Read `src/modules/policy/policy.repository.ts` to find the ACTUAL method name for looking up a policy by leave type ID.\n2. Read `src/modules/leave-management/leave-management.service.test.ts` to see what mock methods are defined on `mockPolicyRepo`.\n3. Align them: either fix the service to call the correct method name from the repository, OR fix the test mock to include the method the service calls.\n\nAlso check ALL other repository method calls in the service against the actual repository interfaces and test mocks:\n- `leaveRepo.findById`, `leaveRepo.create`, `leaveRepo.update`, `leaveRepo.findByEmployeeId` — verify these exist in the actual leave repository\n- `balanceRepo.findByEmployeeIdAndLeaveTypeIdAndYear`, `balanceRepo.update` — verify these exist in the actual balance repository  \n- `employeeRepo.findById` — verify this exists\n- `auditService.log` — verify the signature matches\n\nFix BOTH files so the service calls match the actual repository interfaces AND the test mocks provide all methods the service calls. Ensure mock setup in beforeEach includes all needed mock methods with `jest.fn()`.",
  "extraFlags": [],
  "done": false,
  "reasoning": "The core issue is a mismatch between method names the service calls on repositories vs what the actual repositories export and what the test mocks provide. Need to read all repository files to discover correct method names, then align both the service and test mocks."
}
```

## Iteration 5 decision
```json
{
  "editFormat": "diff",
  "readPaths": [
    "tests/unit/modules/leave-management/leave-management.service.test.ts",
    "src/modules/leave-management/leave-management.service.ts",
    "src/modules/policy/policy.repository.ts"
  ],
  "filePaths": [
    "tests/unit/modules/leave-management/leave-management.service.test.ts",
    "src/modules/leave-management/leave-management.service.ts"
  ],
  "message": "CRITICAL: Jest is running tests from `tests/unit/modules/leave-management/leave-management.service.test.ts` but we've been editing `src/modules/leave-management/leave-management.service.test.ts`. These are TWO DIFFERENT FILES.\n\n1. Read `tests/unit/modules/leave-management/leave-management.service.test.ts` — this is the ACTUAL test file being executed by jest. Fix the mocks in THIS file so they include all methods the service calls.\n\n2. Read `src/modules/policy/policy.repository.ts` to find the ACTUAL method name for looking up a policy by leave type ID. The error says `this.policyRepo.findByLeaveTypeId is not a function` — either:\n   - The service calls `findByLeaveTypeId` but the actual repository method has a different name → fix the service to use the correct name\n   - OR the test mock doesn't include `findByLeaveTypeId` → fix the test mock in `tests/unit/...`\n\n3. Read `src/modules/leave-management/leave-management.service.ts` and verify ALL repository method calls match the actual repository interfaces. Fix any mismatches.\n\n4. Ensure the test file at `tests/unit/modules/leave-management/leave-management.service.test.ts` has complete mocks that match what the service actually calls. The constructor arguments in the test must also match the service constructor parameter order and count.\n\nFix BOTH the service (if method names are wrong) AND the test file at `tests/unit/...` (if mocks are incomplete).",
  "extraFlags": [],
  "done": false,
  "reasoning": "The root cause is clear now: jest runs tests from `tests/unit/modules/leave-management/` but we've been editing `src/modules/leave-management/`. These are different files. Need to fix the actual test file jest is running, and also verify the service method calls match actual repository interfaces."
}
```