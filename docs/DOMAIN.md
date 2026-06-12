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

Represents a leave request record managed by the `leave` module, including leave type, date range, status, reason, and approval information.

## CreateLeaveRequestDto

Represents the data transfer object for creating a leave request, including employee, leave type, start date, end date, and optional reason.

## UpdateLeaveRequestStatusDto

Represents the data transfer object for updating a leave request status, including the target status and manager identifier.
