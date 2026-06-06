# Domain Model — trackeros

To be populated as the design-agent and context-agent learn the domain.

## API Contracts

### POST /api/v1/leaves
Submits a leave request for an employee.

**Request Body:**
- `employeeId`: string
- `leaveType`: string
- `startDate`: string
- `endDate`: string
- `reason`: string

**Response Body:**
- `status`: string
- `message`: string
- `leaveRequestId`: string

**Auth Required:** Yes  
**Roles:** admin, operator

### GET /api/v1/leaves
Retrieves leave records for an employee.

**Request Body:** None

**Response Body:**
- `leaves`: Array<LeaveRecord>

**Auth Required:** Yes  
**Roles:** admin, operator