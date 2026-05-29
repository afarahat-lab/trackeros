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

### Notification

- **userId**: string, required
- **title**: string, required
- **body**: string, required
- **channel**: 'email' | 'sms' | 'push', required
- **scheduledFor**: Date, required

### Setting

- **key**: string, required
- **value**: string, required

### AuditRecord

- **operation**: string, required
- **entity**: string, required
- **timestamp**: Date, required
- **userId**: string, required

### Roles

- **roleName**: string, required
- **permissions**: string[], required

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

### POST /api/v1/notifications
- **Description**: Create a new notification
- **Request Body**:
  - userId: string
  - title: string
  - body: string
  - channel: 'email' | 'sms' | 'push'
  - scheduledFor: Date
- **Response Body**:
  - id: string
  - userId: string
  - title: string
  - body: string
  - channel: 'email' | 'sms' | 'push'
  - scheduledFor: Date
  - createdAt: Date
- **Auth Required**: true
- **Roles**: operator

### GET /api/v1/notifications
- **Description**: Retrieve all notifications
- **Request Body**: {}
- **Response Body**:
  - notifications: array of
    - id: string
    - userId: string
    - title: string
    - body: string
    - channel: 'email' | 'sms' | 'push'
    - scheduledFor: Date
    - createdAt: Date
- **Auth Required**: true
- **Roles**: operator

### GET /api/v1/settings
- **Description**: Retrieve the current settings
- **Request Body**: {}
- **Response Body**:
  - settings: Record<string, string>
- **Auth Required**: true
- **Roles**: operator

### PATCH /api/v1/settings
- **Description**: Update one or more settings keys
- **Request Body**:
  - settings: Partial<Record<string, string>>
- **Response Body**:
  - updatedSettings: Record<string, string>
- **Auth Required**: true
- **Roles**: operator

### GET /api/v1/roles
- **Description**: Retrieve a list of all roles
- **Request Body**: {}
- **Response Body**:
  - roles: Role[]
- **Auth Required**: true
- **Roles**: admin, operator

### POST /api/v1/roles
- **Description**: Create a new role
- **Request Body**:
  - roleName: string
  - permissions: string[]
- **Response Body**:
  - roleId: string
- **Auth Required**: true
- **Roles**: admin

### PUT /api/v1/roles/{roleId}
- **Description**: Update an existing role
- **Request Body**:
  - roleName: string
  - permissions: string[]
- **Response Body**:
  - success: boolean
- **Auth Required**: true
- **Roles**: admin

### DELETE /api/v1/roles/{roleId}
- **Description**: Delete a role
- **Request Body**: {}
- **Response Body**:
  - success: boolean
- **Auth Required**: true
- **Roles**: admin
