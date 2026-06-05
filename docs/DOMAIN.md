# Domain Model — trackeros

## Entities

### LeaveRequest
- **id**: string (required)
- **employeeId**: string (required)
- **leaveType**: LeaveType (required)
- **status**: LeaveStatus (required)
- **startDate**: Date (required)
- **endDate**: Date (required)
- **reason**: string (optional)
- **managerId**: string (required)

### CreateLeaveRequestDto
- **employeeId**: string (required)
- **leaveType**: LeaveType (required)
- **startDate**: Date (required)
- **endDate**: Date (required)
- **reason**: string (optional)

## API Contracts

### POST /api/v1/leave-requests
- **Description**: Create a new leave request
- **Request Body**:
  - employeeId: string
  - leaveType: LeaveType
  - startDate: Date
  - endDate: Date
  - reason: string
- **Response Body**:
  - id: string
  - status: LeaveStatus
- **Auth Required**: true
- **Roles**: employee

### GET /api/v1/leave-requests/{id}
- **Description**: Get leave request by ID
- **Response Body**:
  - id: string
  - employeeId: string
  - leaveType: LeaveType
  - status: LeaveStatus
  - startDate: Date
  - endDate: Date
  - reason: string
  - managerId: string
- **Auth Required**: true
- **Roles**: admin, manager, employee

### GET /api/v1/employees/{employeeId}/leave-requests
- **Description**: Get leave requests by employee ID
- **Response Body**:
  - leaveRequests: LeaveRequest[]
- **Auth Required**: true
- **Roles**: admin, manager, employee

### GET /api/v1/managers/{managerId}/pending-leave-requests
- **Description**: Get pending leave requests by manager ID
- **Response Body**:
  - leaveRequests: LeaveRequest[]
- **Auth Required**: true
- **Roles**: admin, manager

### PATCH /api/v1/leave-requests/{id}/status
- **Description**: Update the status of a leave request
- **Request Body**:
  - status: LeaveStatus
- **Response Body**:
  - id: string
  - status: LeaveStatus
- **Auth Required**: true
- **Roles**: admin, manager
