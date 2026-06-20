import { AuditRecord } from "../../shared/types/index";

export interface CreateAuditEntryDTO {
  entityType: string;
  entityId: string;
  action: string;
  changedBy: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}

export interface IAuditRepository {
  create(entry: CreateAuditEntryDTO): Promise<AuditRecord>;
  findByEntity(entityType: string, entityId: string): Promise<AuditRecord[]>;
}
