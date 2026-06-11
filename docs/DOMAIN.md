# Domain Model — trackeros

## Entities

### LeaveRequest

Represents an employee leave application and its approval status.

Fields:
- `id` (string, required)
- `employeeId` (string, required)
- `leaveType` (`"ANNUAL" | "SICK" | "EMERGENCY"`, required)
- `startDate` (Date, required)
- `endDate` (Date, required)
- `status` (`"PENDING" | "APPROVED" | "REJECTED"`, required)
- `createdAt` (Date, required)
- `updatedAt` (Date, required)

Relationships:
- Employee → LeaveRequest: one-to-many (an Employee can have multiple LeaveRequests)
