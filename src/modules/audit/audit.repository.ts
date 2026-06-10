import type { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { AuditRecord, CreateAuditRecordDto } from './audit.model';

export interface AuditRepository {
  createAuditRecord(dto: CreateAuditRecordDto): Promise<AuditRecord>;
}

export class PostgreSqlAuditRepository implements AuditRepository {
  public constructor(private readonly pool: Pool) {}

  /** Creates an audit record. */
  public async createAuditRecord(dto: CreateAuditRecordDto): Promise<AuditRecord> {
    const record: AuditRecord = {
      id: randomUUID(),
      entityType: dto.entityType,
      entityId: dto.entityId,
      action: dto.action
    };

    await this.pool.query(
      'INSERT INTO audit_records (id, entity_type, entity_id, action) VALUES ($1, $2, $3, $4)',
      [record.id, record.entityType, record.entityId, record.action]
    );

    return record;
  }
}
