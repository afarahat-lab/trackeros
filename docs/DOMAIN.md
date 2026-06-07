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
  - `leaveType`: LeaveType
  - `startDate`: Date
  - `endDate`: Date
- **Response Body**:
  - `id`: string
  - `status`: string
- **Auth Required**: Yes
- **Roles**: admin, operator

## Domain Changes

### LeaveRequest
- **Operation**: create
- **Fields**:
  - `id`: string (required)
  - `employeeId`: string (required)
  - `leaveType`: LeaveType (required)
  - `startDate`: Date (required)
  - `endDate`: Date (required)
  - `status`: string (required)
  - `createdAt`: Date (required)
  - `updatedAt`: Date (required)

### CreateLeaveRequestDto
- **Operation**: create
- **Fields**:
  - `employeeId`: string (required)
  - `leaveType`: LeaveType (required)
  - `startDate`: Date (required)
  - `endDate`: Date (required)

## Design specification (new changes)

{
  "correlationId": "84416e30-e459-4ffd-8fce-fab9be259673",
  "domainChanges": [
    {
      "entityName": "LeaveRequest",
      "operation": "create",
      "fields": [
        {
          "name": "id",
          "type": "string",
          "required": true
        },
        {
          "name": "employeeId",
          "type": "string",
          "required": true
        },
        {
          "name": "leaveType",
          "type": "LeaveType",
          "required": true
        },
        {
          "name": "startDate",
          "type": "Date",
          "required": true
        },
        {
          "name": "endDate",
          "type": "Date",
          "required": true
        },
        {
          "name": "status",
          "type": "string",
          "required": true
        }
      ],
      "relationships": []
    },
    {
      "entityName": "CreateLeaveRequestDto",
      "operation": "create",
      "fields": [
        {
          "name": "leaveType",
          "type": "LeaveType",
          "required": true
        },
        {
          "name": "startDate",
          "type": "Date",
          "required": true
        },
        {
          "name": "endDate",
          "type": "Date",
          "required": true
        }
      ],
      "relationships": []
    }
  ],
  "apiContracts": [
    {
      "method": "POST",
      "path": "/api/v1/leave-requests",
      "description": "Creates a new leave request.",
      "requestBody": {
        "leaveType": "LeaveType",
        "startDate": "Date",
        "endDate": "Date"
      },
      "responseBody": {
        "id": "string",
        "status": "string"
      },
      "authRequired": true,
      "roles": [
        "admin",
        "operator"
      ]
    }
  ],
  "componentSpecs": []
}