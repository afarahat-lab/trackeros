import { IAuditLogRepository } from './audit.repository';

export class AuditLogRepository implements IAuditLogRepository {
  async log(action: string, entityType: string, entityId: string, performedBy: string, details?: any): Promise<void> {
    throw new Error('Not implemented');
  }
}
