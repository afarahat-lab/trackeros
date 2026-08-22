import { randomUUID } from 'crypto';
import { pool } from '../../shared/db/connection';
import { AuditAction } from '../../shared/types';
import { AuditRecord } from './audit.model';
import { IAuditService } from './audit.service.interface';

interface AuditRecordRow {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  performed_by: string;
  changes: Record<string, unknown> | null;
  created_at: Date;
}

function mapRow(row: AuditRecordRow): AuditRecord {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action as AuditAction,
    performedBy: row.performed_by,
    changes: row.changes,
    createdAt: row.created_at,
  };
}

export class AuditService implements IAuditService {
  async record(input: Omit<AuditRecord, 'id' | 'createdAt'>): Promise<AuditRecord> {
    const id = randomUUID();
    const result = await pool.query<AuditRecordRow>(
      `INSERT INTO audit_records (id, entity_type, entity_id, action, performed_by, changes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, entity_type, entity_id, action, performed_by, changes, created_at`,
      [id, input.entityType, input.entityId, input.action, input.performedBy, input.changes ?? null],
    );
    return mapRow(result.rows[0]);
  }
}
