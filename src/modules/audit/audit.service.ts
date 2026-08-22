import { Pool } from 'pg';
import { pool as sharedPool } from '../../shared/db/connection';
import { AuditRecord } from './audit.model';
import { IAuditRepository } from './audit.repository.interface';
import { AuditRepository } from './audit.repository';
import { IAuditService } from './audit.service.interface';

export class AuditService implements IAuditService {
  private readonly auditRepository: IAuditRepository;

  constructor(private readonly pool: Pool = sharedPool) {
    this.auditRepository = new AuditRepository();
  }

  async record(record: Omit<AuditRecord, 'id' | 'createdAt'>): Promise<AuditRecord> {
    return this.auditRepository.insert(record);
  }
}
