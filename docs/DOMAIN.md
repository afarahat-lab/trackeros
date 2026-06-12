# Domain Model — trackeros

To be populated as the design-agent and context-agent learn the domain.

## leave

Represents a leave record managed by the `leave` module, including leave requests and related leave-tracking data.

## balance

Represents leave balance data managed by the `balance` module, including tracked entitlement, accrual, and remaining leave amounts.

## employee

Represents employee data managed by the `employee` module, including employee records and related personnel information.

## policy

Represents leave policy data managed by the `policy` module, including policy definitions, rules, and leave entitlement configurations.

## notification

Represents notification data managed by the `notification` module, including notification records, delivery status, and related messaging information.

## audit

Represents audit data managed by the `audit` module, including audit records, change history, and activity tracking information.

## LeaveRequest

Represents a leave request managed by the `leave` module, including leave request records and related leave-tracking data.

### Fields

- `id`: string (required)
- `employeeId`: string (required)
- `leaveType`: LeaveType (required)
- `startDate`: Date (required)
- `endDate`: Date (required)
- `status`: LeaveStatus (required)
- `reason`: string | null
- `managerId`: string | null
- `createdAt`: Date (required)
- `updatedAt`: Date (required)

### Relationships

- Many-to-one with `Employee` (as requester)
- Many-to-one with `Employee` (as manager)
