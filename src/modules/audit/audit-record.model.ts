export interface AuditRecord {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  performedBy: string;
  changes: Record<string, unknown>;
  createdAt: Date;
}
