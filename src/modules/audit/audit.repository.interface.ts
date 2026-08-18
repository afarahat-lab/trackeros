import { AuditRecord } from './audit.model';

export interface IAuditRepository {
  create(record: AuditRecord): Promise<AuditRecord>;
  findByEntity(entityType: string, entityId: string): Promise<AuditRecord[]>;
}
