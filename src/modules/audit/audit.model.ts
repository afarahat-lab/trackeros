export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  changedBy?: string;
  changedAt: Date;
}

export interface CreateAuditLogDto {
  entityType: string;
  entityId: string;
  action: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  changedBy?: string;
}
