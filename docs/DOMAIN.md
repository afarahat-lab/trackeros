# Domain Model — trackeros

## Entities

### LeaveRequest

Represents an employee leave request.

Fields:
- `id` (string, required)
- `employeeId` (string, required)
- `leaveType` ('ANNUAL' | 'SICK' | 'EMERGENCY', required)
- `status` ('PENDING' | 'APPROVED' | 'REJECTED', required)

Relationships:
- One-to-many with `AuditRecord`

### AuditRecord

Represents an audit trail entry for leave request actions.

Fields:
- `id` (string, required)
- `entityType` ('LeaveRequest', required)
- `entityId` (string, required)
- `action` ('CREATED' | 'APPROVED' | 'REJECTED', required)

Relationships:
- One-to-one with `LeaveRequest`
