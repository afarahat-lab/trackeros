import type { Pool } from "pg";
import { randomUUID } from "crypto";
import { AuditRecord } from "./audit.model";

export interface AuditRecordRepository {
  create(record: AuditRecord): Promise<AuditRecord>;
}

export class PostgreSqlAuditRecordRepository implements AuditRecordRepository {
  public constructor(private readonly pool: Pool) {}

  /** Creates an audit record. */
  public async create(record: AuditRecord): Promise<AuditRecord> {
    const persisted: AuditRecord = {
      ...record,
      id: record.id || randomUUID()
    };

    await this.pool.query(
      `INSERT INTO audit_records (id, entity_type, entity_id, action, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [persisted.id, persisted.entityType, persisted.entityId, persisted.action, persisted.createdAt]
    );

    return persisted;
  }
}
