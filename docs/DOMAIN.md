# Domain Model — trackeros

To be populated as the design-agent and context-agent learn the domain.

## LeaveRequest

### Fields
- **id**: string (required)
- **employeeId**: string (required)
- **leaveType**: string (required)
- **startDate**: Date (required)
- **endDate**: Date (required)
- **status**: string (required)

### API Contract
- **Method**: POST
- **Path**: /api/v1/leave-requests
- **Description**: Creates a new leave request
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