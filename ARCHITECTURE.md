# Architecture

## Leave Management Module

### Domain Models
- `src/modules/leave/leave.model.ts` — `LeaveRequest`, `CreateLeaveRequestDto`, `UpdateLeaveRequestDto`, `LeaveRequestQuery`
- `src/modules/balance/balance.model.ts` — `LeaveBalance`, `LeaveBalanceQuery`

### Repositories
- `src/modules/leave/leave.repository.ts` — `ILeaveRepository`
- `src/modules/balance/balance.repository.ts` — `ILeaveBalanceRepository`

### Shared Types
- `src/shared/types/leave.types.ts` — `LeaveType`, `LeaveStatus`, `NotificationType`, `AuditAction`, `EntityType`

### Enums
- `LeaveType`: `ANNUAL`, `SICK`, `MATERNITY`, `PATERNITY`, `UNPAID`, `OTHER`
- `LeaveStatus`: `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`
- `NotificationType`: `LEAVE_REQUEST_CREATED`, `LEAVE_REQUEST_APPROVED`, `LEAVE_REQUEST_REJECTED`, `LEAVE_REQUEST_CANCELLED`, `LEAVE_BALANCE_LOW`, `LEAVE_BALANCE_EXPIRING`
- `AuditAction`: `CREATE`, `UPDATE`, `DELETE`
- `EntityType`: `LEAVE_REQUEST`, `LEAVE_BALANCE`, `LEAVE_POLICY`, `EMPLOYEE`, `NOTIFICATION`

## Employee Module

### Domain Models
- `src/modules/employee/employee.model.ts` — `Employee`, `CreateEmployeeDto`, `UpdateEmployeeDto`

### Repositories
- `src/modules/employee/employee.repository.ts` — `IEmployeeRepository`, `EmployeeRepository`

## Shared Module

### Enums
- `LeaveType`: `ANNUAL`, `SICK`, `EMERGENCY`, `UNPAID`
- `LeaveStatus`: `DRAFT`, `SUBMITTED`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `CANCELLED`

### Database
- `src/shared/database/database.service.ts` — `DatabaseConnection`, `DatabaseService`

### Repositories
- `src/shared/repositories/base.repository.ts` — `BaseEntity`, `IRepository<T>`, `BaseRepository<T>`

### Errors
- `src/shared/errors/app-error.ts` — `AppError`, `ErrorCode`
