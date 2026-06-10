# Domain Model — trackeros

## LeaveRequest

### Fields
- **id**: string (required)
- **employeeId**: string (required)
- **leaveType**: string (required)
- **startDate**: Date (required)
- **endDate**: Date (required)
- **status**: string (required)

### Relationships
None

## API Contracts

### Create Leave Request
- **Method**: POST
- **Path**: /api/v1/leave-requests
- **Description**: Create a new leave request
- **Request Body**:
  - employeeId: string
  - leaveType: string
  - startDate: Date
  - endDate: Date
  - status: string
- **Response Body**:
  - id: string
  - employeeId: string
  - leaveType: string
  - startDate: Date
  - endDate: Date
  - status: string
- **Auth Required**: true
- **Roles**: admin, operator

### Retrieve Leave Request
- **Method**: GET
- **Path**: /api/v1/leave-requests/{id}
- **Description**: Retrieve a specific leave request by ID
- **Request Body**: {}
- **Response Body**:
  - id: string
  - employeeId: string
  - leaveType: string
  - startDate: Date
  - endDate: Date
  - status: string
- **Auth Required**: true
- **Roles**: admin, operator

### Update Leave Request
- **Method**: PUT
- **Path**: /api/v1/leave-requests/{id}
- **Description**: Update an existing leave request
- **Request Body**:
  - employeeId: string
  - leaveType: string
  - startDate: Date
  - endDate: Date
  - status: string
- **Response Body**:
  - id: string
  - employeeId: string
  - leaveType: string
  - startDate: Date
  - endDate: Date
  - status: string
- **Auth Required**: true
- **Roles**: admin, operator

### Delete Leave Request
- **Method**: DELETE
- **Path**: /api/v1/leave-requests/{id}
- **Description**: Delete a leave request by ID
- **Request Body**: {}
- **Response Body**: {}
- **Auth Required**: true
- **Roles**: admin, operator