# Architecture

## Leave Management Module

### Domain Models
- `src/modules/leave/leave.model.ts` — `LeaveRequest`, `CreateLeaveRequestDto`, `UpdateLeaveRequestDto`, `LeaveRequestQueryParams`
- `src/modules/balance/balance.model.ts` — `LeaveBalance`, `LeaveBalanceQueryParams`
- `src/modules/policy/policy.model.ts` — `LeavePolicy`, `LeavePolicyQueryParams`

### Repositories
- `src/modules/leave/leave.repository.ts` — `ILeaveRepository`
- `src/modules/balance/balance.repository.ts` — `ILeaveBalanceRepository`
- `src/modules/policy/policy.repository.ts` — `ILeavePolicyRepository`

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

## Status Module

The Status module provides a simple health-check endpoint. It defines:

- **SystemStatus** — A transient value object with `up: boolean` and `version: string` fields, computed inline and discarded after the response.
- **IStatusService** — Service interface with a single `getStatus(): SystemStatus` method.
- **StatusService** — Implementation that returns `{ up: true, version: '1' }`.

No database or repository is needed — this is purely read-only.

## Notes Module

### Domain Models
- `src/modules/notes/notes.model.ts` — `Note`, `CreateNoteDto`, `NoteStatus`

### Repositories
- `src/modules/notes/notes.repository.ts` — `INotesRepository`, `PostgresNotesRepository`

### Enums
- `NoteStatus`: `ACTIVE`, `ARCHIVED`
