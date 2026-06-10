# Domain Model — trackeros

To be populated as the design-agent and context-agent learn the domain.

## Entities

### LeaveRequest

Represents an employee leave request.

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
- One-to-one with `Employee`

### AuditRecord

Represents an audit trail record for leave request actions.

Fields:
- `entityId` (string, required)
- `entityType` (`"LEAVE_REQUEST"`, required)
- `action` (`"CREATE" | "APPROVE" | "REJECT"`, required)
- `performedBy` (string, required)
- `createdAt` (Date, required)

Relationships:
- One-to-one with `LeaveRequest`
