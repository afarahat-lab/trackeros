# Architecture

## Leave Management Module

### Domain Models
- `src/modules/leave/leave.model.ts` — `LeaveRequest`, `CreateLeaveRequestDto`, `LeavePolicy`, `LeaveBalance`, `Employee`, `AuditLog`

### Repositories
- `src/modules/leave/leave.repository.ts` — `ILeaveRepository`, `LeaveRepository`
- `src/modules/leave/policy.repository.ts` — `ILeavePolicyRepository`, `LeavePolicyRepository`
- `src/modules/leave/balance.repository.ts` — `ILeaveBalanceRepository`, `LeaveBalanceRepository`

All repository methods currently throw `Not implemented`; database integration will be added in Phase 2.

## Employee Module

### Domain Models
- `src/modules/employee/employee.model.ts` — `Employee`, `CreateEmployeeDto`, `UpdateEmployeeDto`

### Repositories
- `src/modules/employee/employee.repository.ts` — `IEmployeeRepository`, `EmployeeRepository`
