import { AuditLog, AuditLogCreationError, IAuditRepository } from './audit.model';

export class AuditService {
  constructor(private readonly auditRepo: IAuditRepository) {}

  async log(entry: Omit<AuditLog, 'id' | 'performedAt'>): Promise<AuditLog> {
    try {
      return await this.auditRepo.create(entry);
    } catch (error) {
      throw new AuditLogCreationError(
        `Failed to create audit log: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getEntityHistory(entityType: string, entityId: string): Promise<AuditLog[]> {
    return this.auditRepo.findByEntity(entityType, entityId);
  }

  async getUserActions(performedBy: string, limit?: number): Promise<AuditLog[]> {
    return this.auditRepo.findByPerformer(performedBy, limit);
  }
}
