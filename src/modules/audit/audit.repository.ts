import type { AuditRecord, CreateAuditRecordInput } from "./audit.model";

/**
 * Canonical PostgreSQL schema for future persistence implementation.
 *
 * CREATE TABLE audit_records (
 *   id UUID PRIMARY KEY,
 *   entity_type VARCHAR(100) NOT NULL,
 *   entity_id UUID NOT NULL,
 *   action VARCHAR(100) NOT NULL
 * );
 *
 * Transaction semantics: audit persistence is executed as a separate
 * repository operation in this phase. No multi-entity atomic transaction
 * behavior is introduced.
 */
export interface AuditRepository {
  create(input: CreateAuditRecordInput): Promise<AuditRecord>;
  findByEntity(entityType: string, entityId: string): Promise<AuditRecord[]>;
}

export abstract class PostgreSqlAuditRepository implements AuditRepository {
  public abstract create(input: CreateAuditRecordInput): Promise<AuditRecord>;

  public abstract findByEntity(
    entityType: string,
    entityId: string,
  ): Promise<AuditRecord[]>;
}
