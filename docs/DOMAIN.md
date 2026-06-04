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

#### Relationships
- **User**: one-to-one

## API Contracts

### Create a new leave request
- **Method**: POST
- **Path**: /api/v1/leave-requests
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

### Get a leave request by ID
- **Method**: GET
- **Path**: /api/v1/leave-requests/{id}
- **Description**: Get a leave request by ID
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
- **Roles**: employee, manager

### Get all leave requests for an employee
- **Method**: GET
- **Path**: /api/v1/employees/{employeeId}/leave-requests
- **Description**: Get all leave requests for an employee
- **Response Body**:
  - leaveRequests: LeaveRequest[]
- **Auth Required**: true
- **Roles**: employee, manager

### Get all pending leave requests for a manager
- **Method**: GET
- **Path**: /api/v1/managers/{managerId}/pending-leave-requests
- **Description**: Get all pending leave requests for a manager
- **Response Body**:
  - leaveRequests: LeaveRequest[]
- **Auth Required**: true
- **Roles**: manager

### Update the status of a leave request
- **Method**: PATCH
- **Path**: /api/v1/leave-requests/{id}/status
- **Description**: Update the status of a leave request
- **Request Body**:
  - status: LeaveStatus
- **Response Body**:
  - id: string
  - status: LeaveStatus
- **Auth Required**: true
- **Roles**: manager
