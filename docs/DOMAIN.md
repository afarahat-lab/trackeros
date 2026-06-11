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

### AuditRecord

Represents an audit record persisted by the `audit` module.

Fields:
- `id` (string, required): Unique identifier for the audit record.
- `entityType` (string, required): Type of entity being audited.
- `entityId` (string, required): Identifier of the audited entity.
- `action` (string, required): Action performed on the entity.

Related components:
- `AuditRepository`: Repository contract for audit persistence, exposing create and entity-based lookup operations.
- `PostgreSqlAuditRepository`: PostgreSQL-backed repository implementation/contract for `AuditRecord` persistence using the `audit_records` schema.
- `AuditModel`: Type definitions including `AuditRecord` and `CreateAuditRecordInput`.