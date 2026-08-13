import { AuditRecord } from './audit-record.model';

export interface CreateAuditRecordDto {
  entityType: string;
  entityId: string;
  action: string;
  performedBy: string;
  changes: Record<string, unknown>;
}

export interface IAuditRepository {
  create(dto: CreateAuditRecordDto): Promise<AuditRecord>;
  findByEntity(entityType: string, entityId: string): Promise<AuditRecord[]>;
  findByPerformer(performedBy: string, limit?: number): Promise<AuditRecord[]>;
}
