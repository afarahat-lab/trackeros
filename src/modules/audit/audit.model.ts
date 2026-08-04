import { AuditAction } from '../../shared/types';

export interface AuditRecord {
  id: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  performedBy: string | null;
  performedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
