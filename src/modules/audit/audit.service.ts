import { AuditRecord } from './audit.model';
import { IAuditRepository } from './audit.repository.interface';
import { IAuditService } from './audit.service.interface';

export class AuditService implements IAuditService {
  constructor(private readonly auditRepository: IAuditRepository) {}

  async record(record: Omit<AuditRecord, 'id' | 'createdAt'>): Promise<AuditRecord> {
    return this.auditRepository.insert(record);
  }
}
