# Domain Model — trackeros

## LeaveRequest

Represents an employee leave application that can be reviewed and approved or rejected by an approver.

### Fields

- `id: string` (required)
- `employeeId: string` (required)
- `leaveType: "ANNUAL" | "SICK" | "EMERGENCY"` (required)
- `startDate: Date` (required)
- `endDate: Date` (required)
- `status: "PENDING" | "APPROVED" | "REJECTED"` (required)
- `approverEmployeeId: string | null` (required)
- `createdAt: Date` (required)

### Relationships

- None currently defined.
