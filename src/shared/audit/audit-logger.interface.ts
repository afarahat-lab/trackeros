export interface AuditLogEntry {
  action: string;
  resource: string;
  resourceId: string;
  details?: Record<string, unknown>;
  timestamp?: Date;
}

export interface IAuditLogger {
  log(entry: AuditLogEntry): Promise<void>;
}
