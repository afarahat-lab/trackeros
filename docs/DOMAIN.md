# Domain Model — trackeros

To be populated as the design-agent and context-agent learn the domain.

## API Contracts

### POST /api/v1/leave
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

**Auth Required:** Yes  
**Roles:** admin, operator

### GET /api/v1/leave
Retrieves leave information for the authenticated employee.

**Request Body:** None

**Response Body:**
- `leaves`: array

**Auth Required:** Yes  
**Roles:** admin, operator