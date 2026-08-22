import { AuditRecord } from './audit.model';

export interface IAuditService {
  record(record: Omit<AuditRecord, 'id' | 'createdAt'>): Promise<AuditRecord>;
}
