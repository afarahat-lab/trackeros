# Domain Model — trackeros

To be populated as the design-agent and context-agent learn the domain.

## Entities

### LeaveRequest
- **Fields**:
  - `id`: string (required)
  - `employeeId`: string (required)
  - `leaveType`: LeaveType (required)
  - `startDate`: Date (required)
  - `endDate`: Date (required)
  - `status`: string (required)
  - `createdAt`: Date (required)
  - `updatedAt`: Date (required)

### CreateLeaveRequestDto
- **Fields**:
  - `employeeId`: string (required)
  - `leaveType`: LeaveType (required)
  - `startDate`: Date (required)
  - `endDate`: Date (required)

## API Contracts

### GET /api/v1/health
- **Description**: Returns the health status of the application.
- **Request Body**: None
- **Response Body**:
  - `status`: string
- **Auth Required**: No
- **Roles**: None

### POST /api/v1/leave-requests
- **Description**: Creates a new leave request.
- **Request Body**:
  - `employeeId`: string (required)
  - `leaveType`: LeaveType (required)
  - `startDate`: Date (required)
  - `endDate`: Date (required)
- **Response Body**:
  - `id`: string
  - `employeeId`: string
  - `leaveType`: LeaveType
  - `startDate`: Date
  - `endDate`: Date
  - `status`: string
  - `createdAt`: Date
  - `updatedAt`: Date
- **Auth Required**: Yes
- **Roles**: admin, operator
