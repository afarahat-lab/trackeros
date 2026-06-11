import { AuditRecord, CreateAuditRecordInput } from "./audit.model";

/**
 * Repository contract for audit record persistence.
 */
export interface AuditRepository {
  create(input: CreateAuditRecordInput): Promise<AuditRecord>;
  findByEntity(entityType: string, entityId: string): Promise<AuditRecord[]>;
}

/**
 * PostgreSQL-facing audit repository contract.
 */
export abstract class PostgreSqlAuditRepository implements AuditRepository {
  public abstract create(input: CreateAuditRecordInput): Promise<AuditRecord>;

  public abstract findByEntity(
    entityType: string,
    entityId: string,
  ): Promise<AuditRecord[]>;
}
