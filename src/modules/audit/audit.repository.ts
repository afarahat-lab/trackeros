import { AuditLog, CreateAuditLogDto } from './audit.model';

export interface IAuditLogRepository {
  create(dto: CreateAuditLogDto): Promise<AuditLog>;
  findById(id: string): Promise<AuditLog | null>;
  findByEntity(entityType: string, entityId: string): Promise<AuditLog[]>;
}
