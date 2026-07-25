## base

Base entity providing common fields for domain models.

### BaseEntity

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| createdAt | Date | true |
| updatedAt | Date | true |

## shared types

Canonical enums and types in `src/shared/types/index.ts`, used across all modules.

### LeaveTypeCode

| Value | Description |
|-------|-------------|
| annual | Annual leave |
| sick | Sick leave |
| emergency | Emergency leave |
| unpaid | Unpaid leave |
| maternity | Maternity leave |
| paternity | Paternity leave |

### LeaveStatus

| Value | Description |
|-------|-------------|
| PENDING | Leave request is pending approval |
| APPROVED | Leave request has been approved |
| REJECTED | Leave request has been rejected |
| CANCELLED | Leave request has been cancelled |

### EmploymentStatus

| Value | Description |
|-------|-------------|
| ACTIVE | Currently employed |
| INACTIVE | Not currently active |
| TERMINATED | Employment ended |

## employee

Represents employee data managed by the `employee` module.

### Employee

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| employeeNumber | string | true |
| firstName | string | true |
| lastName | string | true |
| email | string | true |
| managerId | string \| null | false |
| department | string | true |
| hireDate | Date | true |
| terminationDate | Date \| null | false |
| employmentStatus | EmploymentStatus | true |
| createdAt | Date | true |
| updatedAt | Date | true |
| deletedAt | Date \| null | false |

### CreateEmployeeDto

| Field | Type | Required |
|-------|------|----------|
| employeeNumber | string | true |
| firstName | string | true |
| lastName | string | true |
| email | string | true |
| managerId | string \| null | false |
| department | string | true |
| hireDate | Date | true |
| employmentStatus | EmploymentStatus | false |

## leave

Represents leave-related entities managed under `src/modules/leave/`.

### LeaveType

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| code | LeaveTypeCode | true |
| name | string | true |
| description | string | true |
| isActive | boolean | true |
| createdAt | Date | true |
| updatedAt | Date | true |

### CreateLeaveTypeDto

| Field | Type | Required |
|-------|------|----------|
| code | LeaveTypeCode | true |
| name | string | true |
| description | string | true |
| isActive | boolean | false |

### LeavePolicy

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| policyName | string | true |
| leaveTypeId | string | true |
| entitlementDays | number | true |
| accrualRate | number | true |
| maxAccumulation | number | true |
| minimumNoticeDays | number | true |
| requiresManagerApproval | boolean | true |
| isActive | boolean | true |
| createdAt | Date | true |
| updatedAt | Date | true |

### CreateLeavePolicyDto

| Field | Type | Required |
|-------|------|----------|
| policyName | string | true |
| leaveTypeId | string | true |
| entitlementDays | number | true |
| accrualRate | number | true |
| maxAccumulation | number | true |
| minimumNoticeDays | number | true |
| requiresManagerApproval | boolean | false |
| isActive | boolean | false |

## Planned entities (Phases 5–9)

The following entities are designed but not yet implemented. See `PLAN.md` for phase details.

### LeaveRequest (Phase 6)

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| employeeId | string | true |
| leaveTypeId | string | true |
| startDate | Date | true |
| endDate | Date | true |
| totalDays | number | true |
| reason | string | true |
| status | LeaveStatus | true |
| managerId | string | true |
| approvedBy | string \| null | false |
| approvedAt | Date \| null | false |
| rejectionReason | string \| null | false |
| cancelledAt | Date \| null | false |
| createdAt | Date | true |
| updatedAt | Date | true |

### LeaveBalance (Phase 5)

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| employeeId | string | true |
| leaveTypeId | string | true |
| policyId | string | true |
| entitlementDays | number | true |
| usedDays | number | true |
| pendingDays | number | true |
| accruedDays | number | true |
| carriedForwardDays | number | true |
| expiresAt | Date \| null | false |
| year | number | true |
| createdAt | Date | true |
| updatedAt | Date | true |

### AuditLog (Phase 7)

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| entityType | string | true |
| entityId | string | true |
| action | 'CREATED' \| 'UPDATED' \| 'DELETED' \| 'APPROVED' \| 'REJECTED' \| 'CANCELLED' | true |
| performedBy | string | true |
| changes | Record\<string, { from: unknown; to: unknown }\> | true |
| timestamp | Date | true |
| metadata | Record\<string, unknown\> \| null | false |

## system

Represents system-level status information, including health-check and version data.

### SystemStatus

| Field | Type | Required |
|-------|------|----------|
| up | boolean | true |
| version | string | true |
