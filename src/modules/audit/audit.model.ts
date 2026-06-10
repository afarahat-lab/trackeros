export interface AuditRecord {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  createdAt: Date;
}
