import { AuditRecord } from './audit.model';

export interface IAuditRepository {
  create(record: Omit<AuditRecord, 'id' | 'createdAt'>): Promise<AuditRecord>;
  findByEntity(entityType: string, entityId: string): Promise<AuditRecord[]>;
  findByUser(performedBy: string): Promise<AuditRecord[]>;
  findByDateRange(start: Date, end: Date): Promise<AuditRecord[]>;
}
