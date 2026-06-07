# Domain Model — trackeros

To be populated as the design-agent and context-agent learn the domain.

## API Contracts

### GET /api/v1/health
- **Description**: Returns the health status of the application.
- **Request Body**: None
- **Response Body**:
  - `status`: string
- **Auth Required**: No
- **Roles**: None

### POST /api/v1/leave-requests
- **Description**: Create a new leave request
- **Request Body**:
  - `leaveType`: LeaveType
  - `startDate`: Date
  - `endDate`: Date
- **Response Body**:
  - `id`: string
  - `status`: string
  - `createdAt`: Date
  - `updatedAt`: Date
- **Auth Required**: Yes
- **Roles**: admin, operator

## Domain Changes

### LeaveRequest
- **Operation**: create
- **Fields**:
  - `id`: string (required)
  - `employeeId`: string (required)
  - `leaveType`: LeaveType (required)
  - `startDate`: Date (required)
  - `endDate`: Date (required)
  - `status`: string (required)
  - `createdAt`: Date (required)
  - `updatedAt`: Date (required)
- **Relationships**:
  - Employee (one-to-many)

### CreateLeaveRequestDto
- **Operation**: create
- **Fields**:
  - `leaveType`: LeaveType (required)
  - `startDate`: Date (required)
  - `endDate`: Date (required)
- **Relationships**: None