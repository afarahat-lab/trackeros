import { AuditRecord } from './audit.model';

export interface IAuditService {
  log(record: Omit<AuditRecord, 'id' | 'createdAt' | 'performedAt'>): Promise<AuditRecord>;
  getHistory(entityType: string, entityId: string): Promise<AuditRecord[]>;
}
