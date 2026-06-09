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
  - `employeeId`: string (required)
  - `startDate`: Date (required)
  - `endDate`: Date (required)
  - `reason`: string (required)
- **Response Body**:
  - `id`: string
  - `status`: string
- **Auth Required**: Yes
- **Roles**: admin, operator

### GET /api/v1/leave-requests
- **Description**: Retrieves a list of leave requests.
- **Request Body**: {}
- **Response Body**:
  - `leaveRequests`: Array of LeaveRequest:
    - `id`: string
    - `employeeId`: string
    - `startDate`: Date
    - `endDate`: Date
    - `reason`: string
    - `status`: string
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
  - `startDate`: Date (required)
  - `endDate`: Date (required)
  - `reason`: string (required)
  - `status`: string (required)

### CreateLeaveRequestDto
- **Fields**:
  - `employeeId`: string (required)
  - `startDate`: Date (required)
  - `endDate`: Date (required)
  - `reason`: string (required)

### LeaveBalance
- **Fields**:
  - `employeeId`: string (required)
  - `leaveTypeId`: string (required)
  - `balance`: number (required)
  - `remainingLeaves`: number (required)
  - `usedLeaves`: number (required)
  - `totalLeaves`: number (required)
