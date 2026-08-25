import { AuditRecord } from './audit.model';

export interface IAuditRepository {
  create(record: Omit<AuditRecord, 'id' | 'createdAt'>): Promise<AuditRecord>;
  findByEntity(entityType: string, entityId: string): Promise<AuditRecord[]>;
  findByPerformer(performedBy: string, limit?: number): Promise<AuditRecord[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<AuditRecord[]>;
}
