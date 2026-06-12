# Domain Model — trackeros

To be populated as the design-agent and context-agent learn the domain.

## LeaveRequest

Represents a leave request managed by the `leave` module, including leave requests and related leave-tracking data.

### Fields

- **id** (`string`, required)
- **employeeId** (`string`, required)
- **leaveType** (`'ANNUAL' | 'SICK' | 'EMERGENCY'`, required)
- **startDate** (`Date`, required)
- **endDate** (`Date`, required)
- **status** (`'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'`, required)
- **reason** (`string | null`, optional)
- **managerId** (`string | null`, optional)
- **createdAt** (`Date`, required)
- **updatedAt** (`Date`, required)

### Relationships

- **Employee** — many-to-one
- **LeaveBalance** — one-to-many

## LeaveBalance

Represents leave balance data managed by the `balance` module, including tracked entitlement, accrual, and remaining leave amounts.

### Fields

- **id** (`string`, required)
- **employeeId** (`string`, required)
- **leaveType** (`'ANNUAL' | 'SICK' | 'EMERGENCY'`, required)
- **balance** (`number`, required)
- **fiscalYear** (`number`, required)

### Relationships

- **Employee** — many-to-one
- **LeaveRequest** — one-to-many

## employee

Represents employee data managed by the `employee` module, including employee records and related personnel information.

## policy

Represents leave policy data managed by the `policy` module, including policy definitions, rules, and leave entitlement configurations.

## notification

Represents notification data managed by the `notification` module, including notification records, delivery status, and related messaging information.

## audit

Represents audit data managed by the `audit` module, including audit records, change history, and activity tracking information.
