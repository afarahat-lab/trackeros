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
- **Description**: Creates a new leave request.
- **Request Body**:
  - `user`: string (required)
  - `leaveType`: string (required)
  - `startDate`: string (required)
  - `endDate`: string (required)
- **Response Body**:
  - `leaveRequest`: LeaveRequest
- **Auth Required**: Yes
- **Roles**: admin, operator

### GET /api/v1/leave-requests/{id}
- **Description**: Retrieves a specific leave request by ID.
- **Request Body**: {}
- **Response Body**:
  - `id`: string
  - `employeeId`: string
  - `leaveType`: string
  - `startDate`: Date
  - `endDate`: Date
  - `status`: string
- **Auth Required**: Yes
- **Roles**: admin, operator

### PATCH /api/v1/leave-requests/{id}
- **Description**: Updates the status of a leave request.
- **Request Body**:
  - `status`: string
- **Response Body**:
  - `id`: string
  - `status`: string
- **Auth Required**: Yes
- **Roles**: admin, operator

### GET /api/v1/leave-requests
- **Description**: Retrieves all leave requests for the authenticated user.
- **Request Body**: {}
- **Response Body**:
  - `leaveRequests`: LeaveRequest[]
- **Auth Required**: Yes
- **Roles**: admin, operator

### GET /api/v1/leave-balances
- **Description**: Retrieves the leave balance for an employee.
- **Request Body**: {}
- **Response Body**:
  - `employeeId`: string
  - `leaveTypeId`: string
  - `balance`: number
- **Auth Required**: Yes
- **Roles**: admin, operator

## Domain Entities

### LeaveRequest
- **Fields**:
  - `id`: string (required)
  - `employeeId`: string (required)
  - `leaveType`: string (required)
  - `startDate`: Date (required)
  - `endDate`: Date (required)
  - `status`: string (required)
  - `user`: string (required)
- **Relationships**:
  - `employee`: Employee (one-to-one)
  - `createdAt`: Date (required)
  - `updatedAt`: Date (required)

### CreateLeaveRequestDto
- **Fields**:
  - `user`: string (required)
  - `leaveType`: string (required)
  - `startDate`: Date (required)
  - `endDate`: Date (required)

### LeaveBalance
- **Fields**:
  - `employeeId`: string (required)
  - `leaveTypeId`: string (required)
  - `balance`: number (required)
  - `remainingLeaves`: number (required)
  - `usedLeaves`: number (required)
  - `totalLeaves`: number (required)
