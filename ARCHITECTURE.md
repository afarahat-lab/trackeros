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

## Notification Module

### Domain Models
- `src/modules/notification/notification.model.ts` — `Notification`, `CreateNotificationDto`

### Enums
- `NotificationType`: `leave_request_submitted`, `leave_request_approved`, `leave_request_rejected`, `leave_request_cancelled`
- `NotificationStatus`: `pending`, `sent`, `failed`, `read`

### Notification Entity
- `id` (string), `recipientId` (string), `message` (string), `type` (NotificationType), `status` (NotificationStatus), `read` (boolean), `createdAt` (Date)

## Audit Module

### Domain Models
- `src/modules/audit/audit.model.ts` — `AuditLog`, `CreateAuditLogDto`

### AuditLog Entity
- `id` (string), `entityType` (string), `entityId` (string), `action` (string), `oldValue` (Record<string, unknown> | null), `newValue` (Record<string, unknown> | null), `changedBy` (string | null), `changedAt` (Date)
