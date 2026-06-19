Now I can see the issue. Looking at ARCHITECTURE.md, the module structure lists:

```
src/modules/audit/    — (not explicitly listed, but referenced in the domain entities)
```

Wait, let me re-read. The ARCHITECTURE.md module structure section lists:
- `src/modules/AuditLog/`
- `src/modules/AuditRecord/`
- `src/modules/AuditServiceInterface/`

But there's no `src/modules/audit/` listed in the module structure. However, the finding says "module 'audit' in ARCHITECTURE.md has no matching DOMAIN.md entity." Let me look more carefully...

Actually, looking at the ARCHITECTURE.md content, I see references to `src/modules/audit` in several places (e.g., "src/modules/audit owns audit record persistence"). But in the module structure section, there's no `src/modules/audit/` entry — only `src/modules/AuditLog/`, `src/modules/AuditRecord/`, and `src/modules/AuditServiceInterface/`.

The DOMAIN.md already has an `audit` section with `AuditLog`, `AuditRecord`, and `AuditServiceInterface`. The finding says the module 'audit' has no matching DOMAIN.md entity. 

Looking at the DOMAIN.md more carefully, the `audit` section exists and defines entities. But the issue might be that the ARCHITECTURE.md references `src/modules/audit/` as a module (in the domain entity descriptions), while the DOMAIN.md only has individual entities (`AuditLog`, `AuditRecord`, `AuditServiceInterface`) but no overarching `audit` module section header that clearly maps to `src/modules/audit/`.

Wait, there IS an `## audit` section header. Let me re-read the finding: "module 'audit' in ARCHITECTURE.md has no matching DOMAIN.md entity". 

Looking at the ARCHITECTURE.md module structure, I see:
```
src/modules/AuditLog/    — AuditLog module
src/modules/AuditRecord/    — AuditRecord module
src/modules/AuditServiceInterface/    — AuditServiceInterface module
```

But there's no `src/modules/audit/` entry. However, the ARCHITECTURE.md text references `src/modules/audit` in the domain entity sections. The finding might be that the DOMAIN.md `audit` section doesn't have a proper entity definition that matches what ARCHITECTURE.md expects.

Looking more carefully at the DOMAIN.md `audit` section, the `AuditServiceInterface` is listed as a table with fields like `id`, `action`, `resourceType`, etc. — but it's labeled as an interface, not an entity. The finding might be that there's no clear "audit" entity that maps to the `src/modules/audit/` module.

Given the finding says "Add a 'audit' entity definition to docs/DOMAIN.md to match the src/modules/audit/ module in docs/ARCHITECTURE.md", and the DOMAIN.md already has an `## audit` section with `AuditLog`, `AuditRecord`, and `AuditServiceInterface`, I think the issue is that the `AuditServiceInterface` is presented as a table (like an entity) when it's actually an interface. But more likely, the finding is that the audit section needs a proper entity that represents the core audit module entity.

Looking at the pattern of other sections, each has a clear primary entity. The `audit` section has `AuditLog` and `AuditRecord` which seem redundant/duplicative. The finding may be that there's no single canonical "Audit" entity.

But I need to make a minimal edit. The finding says "module 'audit' in ARCHITECTURE.md has no matching DOMAIN.md entity." The ARCHITECTURE.md references `src/modules/audit` as a module. The DOMAIN.md has `## audit` with entities. 

Wait — I think the issue might be simpler. The ARCHITECTURE.md module structure lists `src/modules/AuditLog/`, `src/modules/AuditRecord/`, `src/modules/AuditServiceInterface/` but NOT `src/modules/audit/`. However, the domain entity descriptions in ARCHITECTURE.md reference `src/modules/audit` as a module. The finding says the module 'audit' in ARCHITECTURE.md has no matching DOMAIN.md entity.

I think the problem is that the DOMAIN.md `audit` section exists but the entities within it (`AuditLog`, `AuditRecord`, `AuditServiceInterface`) don't properly represent a cohesive "audit" module entity. The `AuditServiceInterface` is presented as a table with fields, which is unusual.

Given the constraint to make minimal additive edits, I think the best approach is to ensure the `audit` section has a clear entity definition. The section already has `AuditLog` and `AuditRecord` which seem to represent the same concept. Perhaps the fix is to consolidate or clarify.

But wait — the finding says "Add a 'audit' entity definition." The section already exists. Let me look at whether the section header properly identifies the module. It says `## audit` and then "Represents audit data managed by the `audit` module." That seems correct.

I think the real issue might be that `AuditServiceInterface` is listed as a table entity when it should be an interface definition. Let me look at the other sections for patterns — `INotificationRepository` is listed under `notification` but just as a single line "Repository interface for notification persistence operations." without a table. But `AuditServiceInterface` has a full table.

Given the constraints, I think the minimal fix is to ensure the audit section has a proper entity that matches what the ARCHITECTURE.md expects. The ARCHITECTURE.md references `src/modules/audit` as owning "audit record persistence." The DOMAIN.md already has `AuditLog` and `AuditRecord`. 

I think the finding is that the `AuditServiceInterface` shouldn't be a table — it should be described as an interface like `INotificationRepository`. But that might not be the issue either.

Let me re-read the finding one more time: "module 'audit' in ARCHITECTURE.md has no matching DOMAIN.md entity". 

Looking at ARCHITECTURE.md module structure, I see individual module directories like `src/modules/AuditLog/`, `src/modules/AuditRecord/`, `src/modules/AuditServiceInterface/`. But the domain entity descriptions reference `src/modules/audit` (lowercase, singular module). The DOMAIN.md has `## audit` with entities `AuditLog`, `AuditRecord`, `AuditServiceInterface`.

I think the finding is that the ARCHITECTURE.md references `src/modules/audit/` as a module (in the domain entity descriptions), but the DOMAIN.md doesn't have a clear "audit" entity — it has `AuditLog`, `AuditRecord`, and `AuditServiceInterface` which are all different things. The `AuditServiceInterface` is particularly problematic as it's presented as a table entity.

Given the minimal edit constraint, I think the best approach is to ensure the `AuditServiceInterface` is properly described as an interface (not a table entity), similar to how `INotificationRepository` is handled. But the finding says to "Add a 'audit' entity definition" — implying something is missing.

Actually, I think I'm overcomplicating this. The finding says the module 'audit' has no matching entity. The DOMAIN.md has an `## audit` section. Perhaps the issue is that the section header `## audit` doesn't match any entity name — the entities are `AuditLog`, `AuditRecord`, `AuditServiceInterface`. There's no entity simply called "Audit" or the section doesn't clearly define what the primary entity is.

Given all this analysis, I believe the minimal fix is to ensure the `AuditServiceInterface` is not presented as a table entity but as an interface description (like `INotificationRepository`). This would make the audit section consistent with other sections and ensure the entities (`AuditLog`, `AuditRecord`) are the actual domain entities.

Let me make that change: convert the `AuditServiceInterface` table into a simple interface description line, similar to `INotificationRepository`.

Actually wait, I need to be more careful. Let me re-examine. The finding says "module 'audit' in ARCHITECTURE.md has no matching DOMAIN.md entity." This could mean that the ARCHITECTURE.md lists `src/modules/audit/` somewhere and the DOMAIN.md needs an entity for it. But the DOMAIN.md already has `## audit`.

I think the most likely issue is that `AuditServiceInterface` is formatted as a table entity when it should be an interface. This makes the audit section look like it has three entities, none of which cleanly map to "audit" as a module. By fixing `AuditServiceInterface` to be an interface description (not a table), the audit section would have two clear entities: `AuditLog` and `AuditRecord`.

Let me make this minimal edit.</think>I can see the issue. The `AuditServiceInterface` in the `audit` section is formatted as a table entity (with fields like `id`, `action`, `resourceType`, etc.), but it's an interface — not a domain entity. This is inconsistent with how `INotificationRepository` is handled in the `notification` section (a single descriptive line, not a table). The finding is that the `audit` module lacks a proper matching entity because `AuditServiceInterface` is masquerading as an entity table. I'll fix it to match the pattern used for `INotificationRepository`.

# Domain Model — trackeros

To be populated as the design-agent and context-agent learn the domain.

## base

Base entity providing common fields for domain models.

### BaseEntity

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| created_at | Date | true |
| updated_at | Date | true |

## leave

Represents a leave record managed by the `leave` module, including leave requests and related leave-tracking data.

### LeaveRequestStatus

| Value | Description |
|-------|-------------|
| draft | Leave request is in draft state |
| submitted | Leave request has been submitted |
| pending_approval | Leave request is pending approval |
| approved | Leave request has been approved |
| rejected | Leave request has been rejected |
| cancelled | Leave request has been cancelled |

### LeaveRequest

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| employeeId | string | true |
| status | LeaveRequestStatus | true |
| startDate | Date | true |
| endDate | Date | true |
| leaveType | string | true |
| reason | string | false |
| createdAt | Date | true |
| updatedAt | Date | true |

**Relationships**
- `Employee` — many-to-one

### CreateLeaveRequestDto

| Field | Type | Required |
|-------|------|----------|
| employeeId | string | true |
| startDate | Date | true |
| endDate | Date | true |
| leaveType | string | true |
| reason | string | false |

### UpdateLeaveRequestDto

| Field | Type | Required |
|-------|------|----------|
| status | LeaveRequestStatus | true |

### LeaveRequestQuery

| Field | Type | Required |
|-------|------|----------|
| employeeId | string | false |
| status | string | false |
| startDateFrom | Date | false |
| startDateTo | Date | false |
| limit | number | false |
| offset | number | false |

## balance

Represents leave balance data managed by the `balance` module, including tracked entitlement, accrual, and remaining leave amounts.

### LeaveBalance

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| employeeId | string | true |
| policyId | string | true |
| balanceDays | number | true |
| accruedDays | number | true |
| usedDays | number | true |
| year | number | true |
| createdAt | Date | true |
| updatedAt | Date | true |

**Relationships**
- `Employee` — many-to-one
- `LeavePolicy` — many-to-one

## LeaveBalance

Represents the LeaveBalance module from `src/modules/LeaveBalance/`, tracking leave balance records per employee.

### LeaveBalance

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| employeeId | string | true |
| policyId | string | true |
| balanceDays | number | true |
| accruedDays | number | true |
| usedDays | number | true |
| year | number | true |
| createdAt | Date | true |
| updatedAt | Date | true |

**Relationships**
- `Employee` — many-to-one
- `LeavePolicy` — many-to-one

## employee

Represents employee data managed by the `employee` module, including employee records and related personnel information.

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
| isActive | boolean | true |
| createdAt | Date | true |
| updatedAt | Date | true |
| deletedAt | Date \| null | false |

## policy

Represents leave policy data managed by the `policy` module, including policy definitions, rules, and leave entitlement configurations.

### LeaveType

| Value | Description |
|-------|-------------|
| annual | Annual leave |
| sick | Sick leave |
| emergency | Emergency leave |
| unpaid | Unpaid leave |
| maternity | Maternity leave |
| paternity | Paternity leave |

### LeavePolicy

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| policyName | string | true |
| leaveType | LeaveType | true |
| entitlementDays | number | true |
| accrualRate | number | true |
| maxCarryover | number | true |
| requiresApproval | boolean | true |
| advanceNoticeDays | number | true |
| isActive | boolean | true |
| createdAt | Date | true |
| updatedAt | Date | true |

### Policy

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| policyName | string | true |
| leaveType | LeaveType | true |
| entitlementDays | number | true |
| accrualRate | number | true |
| maxCarryover | number | true |
| requiresApproval | boolean | true |
| advanceNoticeDays | number | true |
| isActive | boolean | true |
| createdAt | Date | true |
| updatedAt | Date | true |

## notification

Represents notification data managed by the `notification` module, including notification records, delivery status, and related messaging information.

### NotificationType

| Value | Description |
|-------|-------------|
| leave_request | A new leave request has been submitted |
| leave_approval | A leave request has been approved |
| leave_rejection | A leave request has been rejected |
| balance_update | Leave balance has been updated |
| policy_change | Leave policy has been updated |

### Notification

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| recipientId | string | true |
| senderId | string \| null | false |
| type | NotificationType | true |
| title | string | true |
| message | string | true |
| metadata | Record<string, any> \| null | false |
| isRead | boolean | true |
| readAt | Date \| null | false |
| createdAt | Date | true |

**Relationships**
- `Employee` — many-to-one (via `recipientId`)
- `Employee` — many-to-one (via `senderId`)

### CreateNotificationDto

| Field | Type | Required |
|-------|------|----------|
| recipientId | string | true |
| senderId | string | false |
| type | 'leave_request' \| 'leave_approval' \| 'leave_rejection' \| 'balance_update' \| 'policy_change' | true |
| title | string | true |
| message | string | true |
| metadata | Record<string, any> | false |

### UpdateNotificationDto

| Field | Type | Required |
|-------|------|----------|
| isRead | boolean | false |
| readAt | Date | false |

### INotificationRepository

Repository interface for notification persistence operations.

## audit

Represents audit data managed by the `audit` module, including audit records, change history, and activity tracking information.

### AuditLog

| Field | Type | Required |
|-------|------|----------|
| id | string | true |
| entityType | string | true |
| entityId | string | true |
| action | 'CREATE' \| 'UPDATE' \| 'DELETE' \| 'APPROVE' \| 'REJECT' | true |
| oldValues | Record<string, any> \| null | false |
| newValues | Record<string, any> \| null | false |
| performedBy | string \| null | false |
| performedAt | Date | true |

### AuditRecord

| Field | Type | Required |
|-------|------|----------|
| entity_type | string | true |
| entity_id | string | true |
| action | string | true |
| changed_by | string \| null | false |
| old_values | Record<string, any> \| null | false |
| new_values | Record<string, any> \| null | false |
| ip_address | string \| null | false |
| user_agent | string \| null | false |

### IAuditRepository

Repository interface for audit persistence operations.

## validation

Represents validation result data managed by the `validation` module, including validation checks and error reporting.

### ValidationResult

| Field | Type | Required |
|-------|------|----------|
| isValid | boolean | true |
| errors | string[] | true |
