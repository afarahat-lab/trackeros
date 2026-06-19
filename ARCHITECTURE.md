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
- `AdjustmentType`: `accrual`, `usage`, `correction`

## Employee Module

### Domain Models
- `src/modules/employee/employee.model.ts` — `Employee`, `CreateEmployeeDto`, `UpdateEmployeeDto`

### Repositories
- `src/modules/employee/employee.repository.ts` — `IEmployeeRepository`, `EmployeeRepository`

## Services

### Leave Service
- `src/modules/leave/leave.service.ts` — `LeaveRequestService`, `LeaveRequestServiceImpl`
- `src/modules/leave/leave.dto.ts` — `CreateLeaveRequestDto`, `SubmitLeaveRequestDto`, `ReviewLeaveRequestDto`, `CancelLeaveRequestDto`, `LeaveRequestQueryDto`

### Balance Service
- `src/modules/balance/balance.service.ts` — `LeaveBalanceService`, `LeaveBalanceServiceImpl`
- `src/modules/balance/balance.dto.ts` — `BalanceAdjustmentDto`, `LeaveBalanceDto`

### Notification Service
- `src/modules/notification/notification.service.ts` — `NotificationService`, `NotificationServiceImpl`
- `src/modules/notification/notification.dto.ts` — `CreateNotificationDto`, `MarkAsReadDto`, `NotificationQueryDto`

### Audit Service
- `src/modules/audit/audit.service.ts` — `AuditLogService`, `AuditLogServiceImpl`
