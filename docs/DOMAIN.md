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

### POST /api/v1/leaves
- **Description**: Creates a new leave request.
- **Request Body**:
  - `employeeId`: string (required)
  - `balanceId`: string (required)
  - `startDate`: Date (required)
  - `endDate`: Date (required)
  - `status`: string (required)
- **Response Body**:
  - `id`: string
  - `employeeId`: string
  - `balanceId`: string
  - `startDate`: Date
  - `endDate`: Date
  - `status`: string
- **Auth Required**: Yes
- **Roles**: admin, operator

### GET /api/v1/leaves/{id}
- **Description**: Retrieves a leave request by ID.
- **Request Body**: {}
- **Response Body**:
  - `id`: string
  - `employeeId`: string
  - `balanceId`: string
  - `startDate`: Date
  - `endDate`: Date
  - `status`: string
- **Auth Required**: Yes
- **Roles**: admin, operator

### PUT /api/v1/leaves/{id}
- **Description**: Updates an existing leave request.
- **Request Body**:
  - `employeeId`: string (required)
  - `balanceId`: string (required)
  - `startDate`: Date (required)
  - `endDate`: Date (required)
  - `status`: string (required)
- **Response Body**:
  - `id`: string
  - `employeeId`: string
  - `balanceId`: string
  - `startDate`: Date
  - `endDate`: Date
  - `status`: string
- **Auth Required**: Yes
- **Roles**: admin, operator

### DELETE /api/v1/leaves/{id}
- **Description**: Deletes a leave request by ID.
- **Request Body**: {}
- **Response Body**: {}
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

### Leave
- **Fields**:
  - `id`: string (required)
  - `employeeId`: string (required)
  - `balanceId`: string (required)
  - `startDate`: Date (required)
  - `endDate`: Date (required)
  - `status`: string (required)

### CreateLeaveRequestDto
- **Fields**:
  - `employeeId`: string (required)
  - `balanceId`: string (required)
  - `startDate`: Date (required)
  - `endDate`: Date (required)
  - `status`: string (required)

### LeaveBalance
- **Fields**:
  - `employeeId`: string (required)
  - `leaveTypeId`: string (required)
  - `balance`: number (required)
  - `remainingLeaves`: number (required)
  - `usedLeaves`: number (required)
  - `totalLeaves`: number (required)
