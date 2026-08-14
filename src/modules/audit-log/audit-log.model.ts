import { AuditAction } from '../../shared/types/leave.types';

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  performedBy: string;
  performedAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}
