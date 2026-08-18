export interface AuditRecord {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  performedBy: string;
  performedAt: Date;
  ipAddress: string | undefined;
  userAgent: string | undefined;
  createdAt: Date;
}
