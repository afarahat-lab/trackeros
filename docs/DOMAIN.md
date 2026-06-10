# Domain Model — trackeros

To be populated as the design-agent and context-agent learn the domain.

## Entities

### LeaveRequest

Represents an employee leave request that can be reviewed and approved or rejected.

Fields:
- `id` (string, required)
- `employeeId` (string, required)
- `leaveType` (`"ANNUAL" | "SICK" | "EMERGENCY"`, required)
- `startDate` (Date, required)
- `endDate` (Date, required)
- `status` (`"PENDING" | "APPROVED" | "REJECTED"`, required)
- `approverEmployeeId` (string | null, required)
- `createdAt` (Date, required)

Relationships:
- None defined.
