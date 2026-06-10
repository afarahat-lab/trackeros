# Domain Model — trackeros

To be populated as the design-agent and context-agent learn the domain.

## Entities

### LeaveRequest

Represents an employee leave request.

Fields:
- id: string (required)
- employeeId: string (required)
- leaveType: "ANNUAL" | "SICK" | "EMERGENCY" (required)
- startDate: Date (required)
- endDate: Date (required)
- status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" (required)
- createdAt: Date (required)
- updatedAt: Date (required)

Relationships:
- Employee (one-to-one)

### AuditRecord

Represents an audit trail entry for entity actions.

Fields:
- id: string (required)
- entityType: string (required)
- entityId: string (required)
- action: string (required)
- createdAt: Date (required)

Relationships:
- LeaveRequest (one-to-one)