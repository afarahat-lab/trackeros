import { AuditLog } from './audit.model';

export interface AuditLogFilters {
  entityType?: string;
  entityId?: string;
  performedBy?: string;
  action?: string;
  performedFrom?: Date;
  performedTo?: Date;
}

export interface IAuditLogRepository {
  findById(id: string): Promise<AuditLog | null>;
  findByEntity(entityType: string, entityId: string): Promise<AuditLog[]>;
  findByPerformedBy(performedBy: string, limit?: number): Promise<AuditLog[]>;
  create(entry: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog>;
  findAll(filters: AuditLogFilters): Promise<AuditLog[]>;
}
