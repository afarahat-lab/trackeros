import { AuditRecord } from './audit.model';
import { IAuditRepository } from './audit.repository.interface';
import { IAuditService } from './audit.service.interface';

export class AuditService implements IAuditService {
  constructor(private readonly repository: IAuditRepository) {}

  async log(record: Omit<AuditRecord, 'id' | 'createdAt' | 'performedAt'>): Promise<AuditRecord> {
    const fullRecord = {
      ...record,
      performedAt: new Date(),
    };
    return this.repository.create(fullRecord);
  }

  async getHistory(entityType: string, entityId: string): Promise<AuditRecord[]> {
    return this.repository.findByEntity(entityType, entityId);
  }
}
