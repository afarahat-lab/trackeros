import { randomUUID } from 'crypto';
import { Pool, PoolClient, QueryResult } from 'pg';
import { pool as defaultPool } from '../../shared/db/connection';
import { AuditAction } from '../../shared/types';
import { AuditLog, CreateAuditLogInput } from './audit.model';
import { IAuditRepository } from './audit.repository.interface';

interface AuditLogRow {
  id: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before_state: string | null;
  after_state: string | null;
  occurred_at: Date;
}

function parseState(value: string | null): unknown | null {
  return value === null ? null : JSON.parse(value);
}

function mapRow(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    actorId: row.actor_id,
    action: row.action as AuditAction,
    entityType: row.entity_type,
    entityId: row.entity_id,
    beforeState: parseState(row.before_state),
    afterState: parseState(row.after_state),
    occurredAt: row.occurred_at,
  };
}

const COLUMNS =
  'id, actor_id, action, entity_type, entity_id, before_state, after_state, occurred_at';

export class PgAuditLogRepository implements IAuditRepository {
  constructor(private readonly dbPool: Pool = defaultPool) {}

  private db(client?: PoolClient): Pool | PoolClient {
    return client ?? this.dbPool;
  }

  async create(input: CreateAuditLogInput, client?: PoolClient): Promise<AuditLog> {
    const id = randomUUID();
    const occurredAt = new Date();
    const query = `
      INSERT INTO audit_logs (
        id, actor_id, action, entity_type, entity_id, before_state, after_state, occurred_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING ${COLUMNS}
    `;
    const values = [
      id,
      input.actorId,
      input.action,
      input.entityType,
      input.entityId,
      input.beforeState === null ? null : JSON.stringify(input.beforeState),
      input.afterState === null ? null : JSON.stringify(input.afterState),
      occurredAt,
    ];
    const result: QueryResult<AuditLogRow> = await this.db(client).query(query, values);
    return mapRow(result.rows[0]);
  }

  async findById(id: string, client?: PoolClient): Promise<AuditLog | null> {
    const query = `SELECT ${COLUMNS} FROM audit_logs WHERE id = $1`;
    const result: QueryResult<AuditLogRow> = await this.db(client).query(query, [id]);
    return result.rows.length ? mapRow(result.rows[0]) : null;
  }
}
