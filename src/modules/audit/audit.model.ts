import { EntityType, AuditAction } from '../../shared/types';

export interface AuditLog {
  id: string;
  entityType: EntityType;
  entityId: string;
  action: AuditAction;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  performedBy: string | null;
  performedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type AuditLogQuery = {
  entityType?: EntityType;
  entityId?: string;
  performedBy?: string;
  from?: Date;
  to?: Date;
};

export interface IAuditLogRepository {
  create(entry: AuditLog): Promise<AuditLog>;
  findById(id: string): Promise<AuditLog | null>;
  findByEntity(entityType: EntityType, entityId: string): Promise<AuditLog[]>;
  findByPerformedAt(from: Date, to: Date): Promise<AuditLog[]>;
  query(query: AuditLogQuery): Promise<AuditLog[]>;
}
