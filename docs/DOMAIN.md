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
  - `leaveType`: string (required)
  - `startDate`: Date (required)
  - `endDate`: Date (required)
- **Response Body**:
  - `id`: string
  - `status`: string
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
  - `leaveTypeId`: string
  - `balance`: number
- **Auth Required**: Yes
- **Roles**: admin, operator

### GET /api/v1/leave-balances/employee/:employeeId/type/:leaveType
- **Description**: Retrieve leave balance for a specific employee and leave type.
- **Request Body**: {}
- **Response Body**:
  - `balance`: LeaveBalance
- **Auth Required**: Yes
- **Roles**: admin, operator

### GET /api/v1/leave-balances/employee/:employeeId
- **Description**: List all leave balances for a specific employee.
- **Request Body**: {}
- **Response Body**:
  - `balances`: LeaveBalance[]
- **Auth Required**: Yes
- **Roles**: admin, operator

### POST /api/v1/leave-balances
- **Description**: Create or update leave balance for an employee.
- **Request Body**:
  - `balance`: CreateOrUpdateLeaveBalanceDto
- **Response Body**:
  - `balance`: LeaveBalance
- **Auth Required**: Yes
- **Roles**: admin, operator

### PATCH /api/v1/leave-balances/adjust/pending
- **Description**: Adjust pending leave balance for an employee.
- **Request Body**:
  - `adjustment`: BalanceAdjustmentDto
- **Response Body**:
  - `balance`: LeaveBalance
- **Auth Required**: Yes
- **Roles**: admin, operator

### PATCH /api/v1/leave-balances/adjust/used
- **Description**: Adjust used leave balance for an employee.
- **Request Body**:
  - `adjustment`: BalanceAdjustmentDto
- **Response Body**:
  - `balance`: LeaveBalance
- **Auth Required**: Yes
- **Roles**: admin, operator

### DELETE /api/v1/leave-balances/reset/period
- **Description**: Reset leave balance period for an employee.
- **Request Body**:
  - `employeeId`: string
- **Response Body**:
  - `message`: Period reset successfully
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
- **Relationships**:
  - `employee`: Employee (one-to-one)
  - `createdAt`: Date (required)
  - `updatedAt`: Date (required)

### CreateLeaveRequestDto
- **Fields**:
  - `employeeId`: string (required)
  - `leaveType`: string (required)
  - `startDate`: Date (required)
  - `endDate`: Date (required)

### LeaveBalance
- **Fields**:
  - `employeeId`: string (required)
  - `leaveType`: LeaveType (required)
  - `totalBalance`: number (required)
  - `pendingBalance`: number (required)
  - `usedBalance`: number (required)
  - `periodStart`: Date (required)
  - `periodEnd`: Date (required)
- **Relationships**:
  - `employee`: Employee (one-to-many)
