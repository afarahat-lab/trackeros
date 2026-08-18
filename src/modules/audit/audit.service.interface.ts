import { AuditRecord } from './audit.model';

export interface IAuditService {
  record(params: {
    entityType: string;
    entityId: string;
    action: string;
    oldValues?: Record<string, unknown> | null;
    newValues?: Record<string, unknown> | null;
    performedBy: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditRecord>;
}
