import { AuditRecord } from "../../shared/types/index";

export interface IAuditService {
  logEntry(entityType: string, entityId: string, action: string, changedBy: string, oldValues?: Record<string, unknown>, newValues?: Record<string, unknown>): Promise<AuditRecord>;
  getAuditTrail(entityType: string, entityId: string): Promise<AuditRecord[]>;
}
