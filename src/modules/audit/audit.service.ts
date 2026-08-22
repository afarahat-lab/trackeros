import { Pool } from 'pg';
import { AuditRecord } from './audit.model';
import { IAuditService } from './audit.service.interface';

export class AuditService implements IAuditService {
  constructor(private readonly pool: Pool) {}

  async record(record: Omit<AuditRecord, 'id' | 'createdAt'>): Promise<AuditRecord> {
    const result = await this.pool.query<AuditRecord>(
      `INSERT INTO audit_records (id, entity_type, entity_id, action, performed_by, changes, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())
       RETURNING id, entity_type AS "entityType", entity_id AS "entityId", action, performed_by AS "performedBy", changes, created_at AS "createdAt"`,
      [record.entityType, record.entityId, record.action, record.performedBy, record.changes]
    );
    return result.rows[0];
  }
}
