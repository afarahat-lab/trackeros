import { AuditLog } from './audit.model';

export interface IAuditLogRepository {
  findById(id: string): Promise<AuditLog | null>;
  findByEntity(entityType: string, entityId: string): Promise<AuditLog[]>;
  findByPerformedBy(performedBy: string, limit?: number): Promise<AuditLog[]>;
  create(entry: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog>;
  findAll(filters: Partial<Pick<AuditLog, 'entityType' | 'entityId' | 'action' | 'performedBy'>>): Promise<AuditLog[]>;
}
