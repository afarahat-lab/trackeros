# Domain Model — trackeros

To be populated as the design-agent and context-agent learn the domain.

## leave

Represents a leave record managed by the `leave` module, including leave requests and related leave-tracking data.

## leaveRequest

Represents a leave request submitted by an employee, including dates, status, and approval workflow details.

**Fields:**
- `id`: string (required)
- `employeeId`: string (required)
- `policyId`: string (required)
- `managerId`: string | null (optional)
- `startDate`: Date (required)
- `endDate`: Date (required)
- `totalDays`: number (required)
- `reason`: string | null (optional)
- `attachmentUrl`: string | null (optional)
- `status`: `'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED'` (required)
- `rejectionReason`: string | null (optional)
- `submittedAt`: Date | null (optional)
- `processedAt`: Date | null (optional)
- `processorId`: string | null (optional)
- `createdAt`: Date (required)
- `updatedAt`: Date (required)

**Relationships:**
- `Employee`: many-to-one
- `LeavePolicy`: many-to-one

## createLeaveRequestDto

Data transfer object used to create a new leave request.

**Fields:**
- `employeeId`: string (required)
- `policyId`: string (required)
- `startDate`: Date (required)
- `endDate`: Date (required)
- `reason`: string (optional)
- `attachmentUrl`: string (optional)

## balance

Represents leave balance data managed by the `balance` module, including tracked entitlement, accrual, and remaining leave amounts.

## employee

Represents employee data managed by the `employee` module, including employee records and related personnel information.

## policy

Represents leave policy data managed by the `policy` module, including policy definitions, rules, and leave entitlement configurations.

## notification

Represents notification data managed by the `notification` module, including notification records, delivery status, and related messaging information.

**Fields:**
- `id`: string (required)
- `recipientId`: string (required)
- `senderId`: string | null (optional)
- `type`: `'LEAVE_SUBMITTED' | 'LEAVE_APPROVED' | 'LEAVE_REJECTED' | 'LEAVE_CANCELLED'` (required)
- `title`: string (required)
- `body`: string (required)
- `relatedEntityType`: `'LEAVE_REQUEST'` (required)
- `relatedEntityId`: string (required)
- `status`: `'CREATED' | 'SENT' | 'READ'` (required)
- `readAt`: Date | null (optional)
- `createdAt`: Date (required)

**Relationships:**
- `Employee`: many-to-one
- `LeaveRequest`: many-to-one

## createNotificationDto

Data transfer object used to create a new notification.

**Fields:**
- `recipientId`: string (required)
- `senderId`: string (optional)
- `type`: `'LEAVE_SUBMITTED' | 'LEAVE_APPROVED' | 'LEAVE_REJECTED' | 'LEAVE_CANCELLED'` (required)
- `title`: string (required)
- `body`: string (required)
- `relatedEntityType`: `'LEAVE_REQUEST'` (required)
- `relatedEntityId`: string (required)

## audit

Represents audit data managed by the `audit` module, including audit records, change history, and activity tracking information.
