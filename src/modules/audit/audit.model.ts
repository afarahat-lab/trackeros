import { AuditAction } from '../../shared/types/index';

export interface AuditRecord {
  id: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  performedBy: string;
  changes: Record<string, unknown> | null;
  timestamp: Date;
  createdAt: Date;
}
