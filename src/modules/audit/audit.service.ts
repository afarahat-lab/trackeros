import { AuditLog, IAuditRepository } from './audit.model';

export class AuditService {
  constructor(private readonly auditRepo: IAuditRepository) {}

  async log(entry: Omit<AuditLog, 'id' | 'performedAt'>): Promise<AuditLog> {
    return this.auditRepo.create(entry);
  }

  async getEntityHistory(entityType: string, entityId: string): Promise<AuditLog[]> {
    return this.auditRepo.findByEntity(entityType, entityId);
  }

  async getUserActions(performedBy: string, limit?: number): Promise<AuditLog[]> {
    return this.auditRepo.findByPerformer(performedBy, limit);
  }
}
