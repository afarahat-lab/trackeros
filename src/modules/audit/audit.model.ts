import { AuditAction } from '../../shared/types';

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  performedBy: string;
  performedAt: Date;
}

export interface IAuditRepository {
  findByEntity(entityType: string, entityId: string): Promise<AuditLog[]>;
  findByPerformer(performedBy: string): Promise<AuditLog[]>;
  create(data: Omit<AuditLog, 'id'>): Promise<AuditLog>;
}
