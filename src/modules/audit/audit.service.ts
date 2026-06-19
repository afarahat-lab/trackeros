export interface AuditLogService {
  log(action: string, entityType: string, entityId: string, userId: string, details?: Record<string, any>): Promise<void>;
}

export class AuditLogServiceImpl implements AuditLogService {
  async log(_action: string, _entityType: string, _entityId: string, _userId: string, _details?: Record<string, any>): Promise<void> {
    // Implementation will be added in a later phase
    throw new Error('Not implemented');
  }
}
