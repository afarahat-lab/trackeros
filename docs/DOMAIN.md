# Domain Model — trackeros

To be populated as the design-agent and context-agent learn the domain.

## Entities

### LeaveRequest
- **employeeId**: string (required) - The ID of the employee requesting leave.
- **startDate**: Date (required) - The start date of the leave.
- **endDate**: Date (required) - The end date of the leave.
- **reason**: string (required) - The reason for the leave request.

## API Contracts

### POST /api/v1/leave-requests
Submits a leave request for an employee.

#### Request Body
- **employeeId**: string
- **startDate**: Date
- **endDate**: Date
- **reason**: string

#### Response Body
- **id**: string - The unique identifier for the leave request.
- **employeeId**: string - The ID of the employee who requested leave.
- **startDate**: Date - The start date of the leave.
- **endDate**: Date - The end date of the leave.
- **reason**: string - The reason for the leave request.
- **status**: string - The status of the leave request.

#### Authentication
- **authRequired**: true
- **roles**: ["admin", "operator"]