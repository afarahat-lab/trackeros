export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  performedBy: string | null;
  performedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
