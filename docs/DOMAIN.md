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
  - `employeeId`: string
  - `leaveType`: string
  - `startDate`: Date
  - `endDate`: Date
- **Response Body**:
  - `id`: string
  - `status`: string
- **Auth Required**: Yes
- **Roles**: admin, operator

### GET /api/v1/leave-requests
- **Description**: Retrieves a list of leave requests.
- **Request Body**: {}
- **Response Body**:
  - Array of leave requests:
    - `id`: string
    - `employeeId`: string
    - `leaveTypeId`: string
    - `startDate`: Date
    - `endDate`: Date
    - `status`: string
    - `createdAt`: Date
    - `updatedAt`: Date
- **Auth Required**: Yes
- **Roles**: admin, operator

### GET /api/v1/leave-balances
- **Description**: Retrieves the leave balance for an employee.
- **Request Body**: {}
- **Response Body**:
  - `employeeId`: string
  - `totalLeaves`: number
  - `usedLeaves`: number
  - `remainingLeaves`: number
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
  - `createdAt`: Date (required)
  - `updatedAt`: Date (required)
- **Relationships**:
  - `LeaveBalance`: one-to-one

### CreateLeaveRequestDto
- **Fields**:
  - `employeeId`: string (required)
  - `leaveType`: string (required)
  - `startDate`: Date (required)
  - `endDate`: Date (required)

### LeaveBalance
- **Fields**:
  - `employeeId`: string (required)
  - `totalLeaves`: number (required)
  - `usedLeaves`: number (required)
  - `remainingLeaves`: number (required)
- **Relationships**:
  - `LeaveRequest`: one-to-many
