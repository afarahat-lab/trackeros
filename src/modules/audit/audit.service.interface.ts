import { AuditRecord } from '../../shared/types';

export interface IAuditService {
  logAudit(record: Omit<AuditRecord, 'id' | 'changedAt'>): Promise<AuditRecord>;
  getAuditLogs(entityType: string, entityId: string): Promise<AuditRecord[]>;
}
