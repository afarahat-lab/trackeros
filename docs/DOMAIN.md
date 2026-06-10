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

### AuditRecord

Represents an audit trail record for actions performed on domain entities.

Fields:
- `id` (string, required)
- `entityId` (string, required)
- `entityType` (string, required)
- `action` (string, required)
- `createdAt` (Date, required)

Relationships:
- `LeaveRequest` (one-to-many)
