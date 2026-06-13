# Domain Model — trackeros

To be populated as the design-agent and context-agent learn the domain.

## LeaveRequest

Represents a leave request managed by the `leave` module, including leave requests and related leave-tracking data.

**Fields:**
- `id` (string, required)
- `employeeId` (string, required)
- `leaveType` (string, required)
- `startDate` (Date, required)
- `endDate` (Date, required)
- `durationDays` (number, required)
- `reason` (string, optional)
- `status` (`'DRAFT' | 'SUBMITTED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED'`, required)
- `managerId` (string, optional)
- `submittedAt` (Date, optional)
- `reviewedAt` (Date, optional)
- `reviewerComments` (string, optional)
- `createdAt` (Date, required)
- `updatedAt` (Date, required)

**Relationships:**
- `Employee` (many-to-one)
- `LeavePolicy` (many-to-one)
- `LeaveBalance` (many-to-one)

## LeaveBalance

Represents leave balance data managed by the `balance` module, including tracked entitlement, accrual, and remaining leave amounts.

**Fields:**
- `id` (string, required)
- `employeeId` (string, required)
- `leaveType` (string, required)
- `entitlementDays` (number, required)
- `usedDays` (number, required)
- `remainingDays` (number, required)
- `accrualRate` (number, optional)
- `accrualFrequency` (string, optional)
- `fiscalYear` (number, required)
- `status` (`'ACTIVE' | 'ARCHIVED'`, required)
- `createdAt` (Date, required)
- `updatedAt` (Date, required)

**Relationships:**
- `Employee` (many-to-one)
- `LeavePolicy` (many-to-one)

## Employee

Represents employee data managed by the `employee` module, including employee records and related personnel information.

**Fields:**
- `id` (string, required)
- `employeeId` (string, required)
- `firstName` (string, required)
- `lastName` (string, required)
- `email` (string, required)
- `managerId` (string, optional)
- `department` (string, optional)
- `hireDate` (Date, required)
- `employmentStatus` (`'ACTIVE' | 'INACTIVE' | 'TERMINATED'`, required)
- `createdAt` (Date, required)
- `updatedAt` (Date, required)

**Relationships:**
- `LeaveRequest` (one-to-many)
- `LeaveBalance` (one-to-many)

## LeavePolicy

Represents leave policy data managed by the `policy` module, including policy definitions, rules, and leave entitlement configurations.

**Fields:**
- `id` (string, required)
- `leaveType` (string, required)
- `entitlementDays` (number, required)
- `accrualMethod` (string, optional)
- `maxAccumulation` (number, optional)
- `advanceLeaveAllowed` (boolean, required)
- `requiresDocumentation` (boolean, required)
- `noticePeriodDays` (number, required)
- `applicableEmploymentTypes` (string[], required)
- `status` (`'ACTIVE' | 'INACTIVE'`, required)
- `createdAt` (Date, required)
- `updatedAt` (Date, required)

**Relationships:**
- `LeaveRequest` (one-to-many)
- `LeaveBalance` (one-to-many)

## notification

Represents notification data managed by the `notification` module, including notification records, delivery status, and related messaging information.

## audit

Represents audit data managed by the `audit` module, including audit records, change history, and activity tracking information.
