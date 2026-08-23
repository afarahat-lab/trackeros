import { AuditAction } from 'shared/types/leave.types';

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

export class AuditLogCreationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuditLogCreationError';
  }
}

export interface IAuditRepository {
  create(entry: Omit<AuditLog, 'id' | 'performedAt'>): Promise<AuditLog>;
  findByEntity(entityType: string, entityId: string): Promise<AuditLog[]>;
  findByPerformer(performedBy: string, limit?: number): Promise<AuditLog[]>;
}
