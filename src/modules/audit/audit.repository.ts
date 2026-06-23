import { pool } from '../../shared/db/connection';
import { AuditRecord, CreateAuditRecordDto } from './audit.model';

export interface IAuditRepository {
  findByEntity(entityType: string, entityId: string): Promise<AuditRecord[]>;
  create(input: CreateAuditRecordDto): Promise<AuditRecord>;
}

export class PgAuditRepository implements IAuditRepository {
  constructor() {}

  async findByEntity(entityType: string, entityId: string): Promise<AuditRecord[]> {
    const result = await pool.query(
      'SELECT * FROM audit_records WHERE entity_type = $1 AND entity_id = $2 ORDER BY performed_at DESC',
      [entityType, entityId]
    );
    return result.rows;
  }

  async create(input: CreateAuditRecordDto): Promise<AuditRecord> {
    const result = await pool.query(
      `INSERT INTO audit_records (entity_type, entity_id, action, old_values, new_values, performed_by, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        input.entityType,
        input.entityId,
        input.action,
        input.oldValues ?? null,
        input.newValues ?? null,
        input.performedBy ?? null,
        input.ipAddress ?? null,
        input.userAgent ?? null,
      ]
    );
    return result.rows[0];
  }
}
