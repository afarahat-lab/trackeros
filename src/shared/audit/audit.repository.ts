export interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  performedBy: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface IAuditLogRepository {
  log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<AuditLogEntry>;
  findByEntity(entity: string, entityId: string): Promise<AuditLogEntry[]>;
}
