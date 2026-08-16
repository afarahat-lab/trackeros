import { AuditLog } from './audit.model';

export interface IAuditService {
  logAction(
    entityType: string,
    entityId: string,
    action: string,
    oldValues: Record<string, unknown> | null,
    newValues: Record<string, unknown> | null,
    performedBy: string,
  ): Promise<AuditLog>;
}
