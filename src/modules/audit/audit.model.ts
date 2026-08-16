/**
 * Represents an immutable audit log record for a state-changing operation
 * on a domain entity. Every create, update, or delete on a tracked entity
 * produces an AuditLog record capturing the before/after state and the
 * identity of the actor who performed the operation.
 *
 * Invariants (enforced at the service layer in later phases):
 * - Every AuditLog record is immutable — it has no update or delete lifecycle.
 *   Once created, its fields are permanent. The repository exposes only
 *   `create` and read methods; there is no mutation path.
 * - Every AuditLog record must reference a valid domain entity via the
 *   composite `(entityType, entityId)` pair. The `entityType` is a string
 *   identifying the domain aggregate (e.g. 'LeaveRequest', 'LeaveBalance',
 *   'LeavePolicy'), and `entityId` is the primary key of that entity.
 *   Referential integrity is enforced at the service/DB layer in later phases.
 * - `oldValues` and `newValues` are independently nullable. When `action` is
 *   `CREATE`, `oldValues` must be `null` and `newValues` must be non-null.
 *   When `action` is `DELETE`, `oldValues` must be non-null and `newValues`
 *   must be `null`. When `action` is `UPDATE`, both must be non-null.
 *   This invariant is enforced at the service layer in a later phase.
 */
export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  performedBy: string | null;
  performedAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}
