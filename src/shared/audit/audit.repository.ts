export interface IAuditLogRepository {
  log(action: string, entityType: string, entityId: string, performedBy: string, details?: any): Promise<void>;
}
