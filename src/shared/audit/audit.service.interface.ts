export interface AuditLogParams {
  entityType: string;
  entityId: string;
  action: string;
  changedBy: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}

export interface IAuditService {
  log(params: AuditLogParams): Promise<void>;
}
