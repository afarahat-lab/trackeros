import { Pool } from 'pg';
import { pool } from '../../shared/db/connection';
import { AuditRecord } from './audit-record.model';
import {
  IAuditRepository,
  CreateAuditRecordDto,
} from './audit-record.repository.interface';

interface AuditRecordRow {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  performed_by: string;
  changes: Record<string, unknown>;
  created_at: Date;
}

type Queryable = Pick<Pool, 'query'>;

function rowToAuditRecord(row: AuditRecordRow): AuditRecord {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    performedBy: row.performed_by,
    changes: row.changes,
    createdAt: row.created_at,
  };
}

const COLUMNS = [
  'id',
  'entity_type',
  'entity_id',
  'action',
  'performed_by',
  'changes',
  'created_at',
].join(', ');

export class AuditRepository implements IAuditRepository {
  private readonly db: Queryable;

  constructor(client?: Queryable) {
    this.db = client ?? pool;
  }

  async create(dto: CreateAuditRecordDto): Promise<AuditRecord> {
    const result = await this.db.query<AuditRecordRow>(
      `INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, changes, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING ${COLUMNS}`,
      [
        dto.entityType,
        dto.entityId,
        dto.action,
        dto.performedBy,
        JSON.stringify(dto.changes),
      ],
    );
    return rowToAuditRecord(result.rows[0]);
  }

  async findByEntity(entityType: string, entityId: string): Promise<AuditRecord[]> {
    const result = await this.db.query<AuditRecordRow>(
      `SELECT ${COLUMNS} FROM audit_logs WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at DESC`,
      [entityType, entityId],
    );
    return result.rows.map(rowToAuditRecord);
  }

  async findByPerformer(performedBy: string, limit?: number): Promise<AuditRecord[]> {
    const limitClause = limit !== undefined ? ` LIMIT $2` : '';
    const params: unknown[] = limit !== undefined ? [performedBy, limit] : [performedBy];

    const result = await this.db.query<AuditRecordRow>(
      `SELECT ${COLUMNS} FROM audit_logs WHERE performed_by = $1 ORDER BY created_at DESC${limitClause}`,
      params,
    );
    return result.rows.map(rowToAuditRecord);
  }
}
