import { PoolClient } from 'pg';
import { pool } from '../../shared/db/connection';
import { AuditRecord } from './audit.model';
import { IAuditRepository } from './audit.repository.interface';

export class AuditRepository implements IAuditRepository {
  async insert(record: Omit<AuditRecord, 'id' | 'createdAt'>, client?: PoolClient): Promise<AuditRecord> {
    const db = client ?? pool;
    const result = await db.query<AuditRecord>(
      `INSERT INTO audit_records (id, entity_type, entity_id, action, performed_by, changes, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())
       RETURNING id, entity_type AS "entityType", entity_id AS "entityId", action, performed_by AS "performedBy", changes, created_at AS "createdAt"`,
      [record.entityType, record.entityId, record.action, record.performedBy, record.changes]
    );
    return result.rows[0];
  }
}
