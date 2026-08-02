import { AuditAction } from '../../shared/types/index';

export interface AuditRecord {
  id: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  performedBy: string;
  details: Record<string, unknown> | null;
  createdAt: Date;
}
