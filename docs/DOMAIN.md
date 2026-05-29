## Current DOMAIN.md

# Domain Model — trackeros

To be populated as the design-agent and context-agent learn the domain.

## Entities

### LeaveRequest

- **employeeId**: string, required
- **startDate**: string, required
- **endDate**: string, required
- **reason**: string, required
- **status**: 'pending' | 'approved' | 'rejected', required

## API Contracts

### POST /api/v1/leave-requests
- **Description**: Create a new leave request
- **Request Body**:
  - employeeId: string
  - startDate: string
  - endDate: string
  - reason: string
  - status: 'pending' | 'approved' | 'rejected'
- **Response Body**:
  - id: string
  - employeeId: string
  - startDate: string
  - endDate: string
  - reason: string
  - status: 'pending' | 'approved' | 'rejected'
- **Auth Required**: true
- **Roles**: admin, operator

### GET /api/v1/leave-requests
- **Description**: List leave requests, optionally filtered by status
- **Request Body**: {}
- **Response Body**:
  - leaveRequests: array of
    - id: string
    - employeeId: string
    - startDate: string
    - endDate: string
    - reason: string
    - status: 'pending' | 'approved' | 'rejected'
- **Auth Required**: true
- **Roles**: admin, operator

### GET /api/v1/audit/logs
- **Description**: Fetches a list of audit logs with pagination support
- **Request Body**: {}
- **Response Body**:
  - logs: Array<AuditLog>
  - pagination:
    - total: number
    - limit: number
    - from: string
    - to: string
- **Auth Required**: true
- **Roles**: admin
