# Domain Model — trackeros

Canonical types are defined in `src/shared/types/index.ts` (Phase 1 ✓).

## Enums

### LeaveType
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
| DRAFT | Leave request is in draft state |
| SUBMITTED | Leave request has been submitted |
| APPROVED | Leave request has been approved |
| REJECTED | Leave request has been rejected |
| CANCELLED | Leave request has been cancelled |

### EmploymentStatus
| Value | Description |
|-------|-------------|
| ACTIVE | Employee is active |
| INACTIVE | Employee is inactive |
| TERMINATED | Employee has been terminated |

### AuditAction
| Value | Description |
|-------|-------------|
| CREATED | Entity was created |
| UPDATED | Entity was updated |
| APPROVED | Entity was approved |
| REJECTED | Entity was rejected |
| CANCELLED | Entity was cancelled |
| BALANCE_DEDUCTED | Balance was deducted |
| BALANCE_RESTORED | Balance was restored |

### NotificationStatus
| Value | Description |
|-------|-------------|
| PENDING | Notification is pending delivery |
| SENT | Notification has been sent |
| FAILED | Notification delivery failed |

## DTOs

### CreateLeaveRequestDto
| Field | Type | Required |
|-------|------|----------|
| employeeId | string | true |
| leaveType | LeaveType | true |
| startDate | string | true |
| endDate | string | true |
| reason | string \| undefined | false |

### UpdateLeaveRequestDto
| Field | Type | Required |
|-------|------|----------|
| status | LeaveStatus | true |
| approverId | string \| null | true |

### LeaveRequestQueryParams
| Field | Type | Required |
|-------|------|----------|
| employeeId | string \| undefined | false |
| leaveType | LeaveType \| undefined | false |
| status | LeaveStatus \| undefined | false |
| startDate | string \| undefined | false |
| endDate | string \| undefined | false |

### ValidationResult
| Field | Type | Required |
|-------|------|----------|
| valid | boolean | true |
| errors | string[] | true |

## Domain Entities

### LeavePolicy (Phase 2 — model + repository interface committed)

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| policyName | string | true |
| leaveType | LeaveType | true |
| entitlementDays | number | true |
| accrualRate | number \| null | false |
| maxAccumulation | number \| null | false |
| minimumNoticeDays | number \| null | false |
| requiresManagerApproval | boolean | true |
| isActive | boolean | true |
| createdAt | Date | true |
| updatedAt | Date | true |

Files: `src/modules/leave-policy/leave-policy.model.ts` (interface), `src/modules/leave-policy/leave-policy.repository.ts` (ILeavePolicyRepository interface), `src/modules/leave-policy/index.ts` (barrel). PG implementation and unit tests not yet built.

### LeaveRequest (planned)
| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| employeeId | string | true |
| leaveType | LeaveType | true |
| startDate | Date | true |
| endDate | Date | true |
| reason | string \| undefined | false |
| status | LeaveStatus | true |
| approverId | string \| null | false |
| approvedAt | Date \| null | false |
| createdAt | Date | true |
| updatedAt | Date | true |

### LeaveBalance (planned)
| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| employeeId | string | true |
| leaveType | string | true |
| fiscalYear | number | true |
| totalEntitlement | number | true |
| usedDays | number | true |
| remainingDays | number | true |
| status | 'ACTIVE' \| 'EXHAUSTED' \| 'FROZEN' | true |
| createdAt | Date | true |
| updatedAt | Date | true |

### Employee (planned)
| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| employeeNumber | string | true |
| firstName | string | true |
| lastName | string | true |
| email | string | true |
| managerId | string \| null | false |
| department | string \| null | false |
| hireDate | Date | true |
| terminationDate | Date \| null | false |
| employmentStatus | EmploymentStatus | true |
| createdAt | Date | true |
| updatedAt | Date | true |
| deletedAt | Date \| null | false |

### AuditLog (planned)
| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| entityType | string | true |
| entityId | string | true |
| action | AuditAction | true |
| performedBy | string | true |
| changes | Record\<string, unknown\> \| null | false |
| timestamp | Date | true |

### Notification (planned)
| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| recipientId | string | true |
| message | string | true |
| type | string | true |
| status | NotificationStatus | true |
| referenceEntityType | string \| null | false |
| referenceEntityId | string \| null | false |
| createdAt | Date | true |
| sentAt | Date \| null | false |

## system

Represents system-level status information, including health-check and version data.

### SystemStatus
| Field | Type | Required |
|-------|------|----------|
| up | boolean | true |
| version | string | true |
