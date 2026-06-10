import { randomUUID } from 'crypto';
import type { Pool } from 'pg';

import { AuditRecord, CreateAuditRecordDto } from './audit.model';

export interface AuditRepository {
  createAuditRecord(dto: CreateAuditRecordDto): Promise<AuditRecord>;
}

export class PostgreSqlAuditRepository implements AuditRepository {
  public constructor(private readonly pool: Pool) {}

  /**
   * Creates an audit record.
   */
  public async createAuditRecord(dto: CreateAuditRecordDto): Promise<AuditRecord> {
    const auditRecord: AuditRecord = {
      id: randomUUID(),
      entityType: dto.entityType,
      entityId: dto.entityId,
      action: dto.action
    };

    try {
      await this.pool.query(
        'INSERT INTO audit_records (id, entity_type, entity_id, action) VALUES ($1, $2, $3, $4)',
        [auditRecord.id, auditRecord.entityType, auditRecord.entityId, auditRecord.action]
      );

      return auditRecord;
    } catch (error: unknown) {
      throw new Error(`AUDIT_RECORD_CREATE_FAILED: ${String(error)}`);
    }
  }
}
