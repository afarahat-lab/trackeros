export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  changedBy: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  createdAt: Date;
}

export interface CreateAuditLogDto {
  entityType: string;
  entityId: string;
  action: string;
  changedBy: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
}
