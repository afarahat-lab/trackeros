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
  - `leaveType`: LeaveType (required)
  - `startDate`: Date (required)
  - `endDate`: Date (required)
- **Response Body**:
  - `id`: string
  - `status`: LeaveStatus
- **Auth Required**: Yes
- **Roles**: admin, operator

### GET /api/v1/leave-requests/{id}
- **Description**: Retrieves a specific leave request by ID.
- **Request Body**: {}
- **Response Body**:
  - `leaveRequest`: LeaveRequest
- **Auth Required**: Yes
- **Roles**: admin, operator

### PATCH /api/v1/leave-requests/{id}
- **Description**: Updates the status of a leave request.
- **Request Body**:
  - `status`: LeaveStatus
- **Response Body**:
  - `status`: LeaveStatus
- **Auth Required**: Yes
- **Roles**: admin, operator

### GET /api/v1/leave-requests
- **Description**: List leave requests by employee or manager.
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

### GET /api/v1/balances
- **Description**: List leave balances by employee
- **Request Body**: {}
- **Response Body**:
  - `balances`: LeaveBalance[]
- **Auth Required**: Yes
- **Roles**: admin, operator

### GET /api/v1/balances/{employeeId}/{leaveType}
- **Description**: Get leave balance for a specific employee and leave type
- **Request Body**: {}
- **Response Body**:
  - `balance`: LeaveBalance
- **Auth Required**: Yes
- **Roles**: admin, operator

### POST /api/v1/balances
- **Description**: Create or update leave balance
- **Request Body**:
  - `balance`: CreateOrUpdateLeaveBalanceDto
- **Response Body**:
  - `balance`: LeaveBalance
- **Auth Required**: Yes
- **Roles**: admin, operator

### PATCH /api/v1/balances/adjust-pending
- **Description**: Adjust pending leave balance
- **Request Body**:
  - `adjustment`: BalanceAdjustmentDto
- **Response Body**:
  - `balance`: LeaveBalance
- **Auth Required**: Yes
- **Roles**: admin, operator

### PATCH /api/v1/balances/adjust-used
- **Description**: Adjust used leave balance
- **Request Body**:
  - `adjustment`: BalanceAdjustmentDto
- **Response Body**:
  - `balance`: LeaveBalance
- **Auth Required**: Yes
- **Roles**: admin, operator

### DELETE /api/v1/balances/reset-period
- **Description**: Reset leave balance period
- **Request Body**:
  - `employeeId`: string
  - `leaveType`: LeaveType
- **Response Body**:
  - `message`: Period reset successfully
- **Auth Required**: Yes
- **Roles**: admin, operator

## Domain Entities

### LeaveRequest
- **Fields**:
  - `id`: string (required)
  - `employeeId`: string (required)
  - `leaveType`: LeaveType (required)
  - `status`: LeaveStatus (required)
  - `startDate`: Date (required)
  - `endDate`: Date (required)
  - `createdAt`: Date (required)
  - `updatedAt`: Date (required)
- **Relationships**:
  - `employee`: Employee (one-to-one)

### CreateLeaveRequestDto
- **Fields**:
  - `employeeId`: string (required)
  - `leaveType`: LeaveType (required)
  - `startDate`: Date (required)
  - `endDate`: Date (required)

### UpdateLeaveRequestStatusDto
- **Fields**:
  - `id`: string (required)
  - `status`: LeaveStatus (required)

### LeaveRequestQuery
- **Fields**:
  - `employeeId`: string (optional)
  - `managerId`: string (optional)
  - `startDate`: Date (optional)
  - `endDate`: Date (optional)

### LeaveBalance
- **Fields**:
  - `employeeId`: string (required)
  - `leaveType`: LeaveType (required)
  - `totalBalance`: number (required)
  - `usedBalance`: number (required)
  - `pendingBalance`: number (required)
  - `periodStart`: Date (required)
  - `periodEnd`: Date (required)

### CreateOrUpdateLeaveBalanceDto
- **Fields**:
  - `employeeId`: string (required)
  - `leaveType`: LeaveType (required)
  - `totalBalance`: number (required)
  - `usedBalance`: number (required)
  - `pendingBalance`: number (required)
  - `periodStart`: Date (required)
  - `periodEnd`: Date (required)

### BalanceAdjustmentDto
- **Fields**:
  - `employeeId`: string (required)
  - `leaveType`: LeaveType (required)
  - `amount`: number (required)