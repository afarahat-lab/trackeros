import { AuditAction } from '../../shared/types';

export interface AuditLog {
  id: string;
  actorId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  beforeState: unknown | null;
  afterState: unknown | null;
  occurredAt: Date;
}

export type CreateAuditLogInput = Omit<AuditLog, 'id' | 'occurredAt'>;
