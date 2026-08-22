import { AuditAction } from '../../shared/types';

export interface AuditRecord {
  id: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  performedBy: string;
  changes: Record<string, unknown> | null;
  createdAt: Date;
}
