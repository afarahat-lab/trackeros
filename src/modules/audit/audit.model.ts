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
