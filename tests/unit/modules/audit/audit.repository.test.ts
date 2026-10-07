import { Pool } from 'pg';
import {
  PgAuditLogRepository,
  AuditLog,
  AuditService,
  IAuditRepository,
} from '../../../../src/modules/audit';
import { LEAVE_REQUEST_ENTITY_TYPE } from '../../../../src/modules/leave/leave.model';
import { AuditAction } from '../../../../src/shared/types';
import { ValidationError } from '../../../../src/shared/errors';

/**
 * The entity-scoped trail read (PgAuditLogRepository.findByEntity).
 *
 * Ordering is a property of the QUERY, not of any caller: every reader of an entity's
 * trail receives occurred_at ASC, id ASC. The id tie-break exists because occurred_at
 * carries no uniqueness guarantee (two writes in the same millisecond), and stability —
 * the same request returning the same order on every call — is the whole requirement.
 *
 * The fake pool is injected through the repository's existing `dbPool` constructor seam
 * and captures the SQL and params the repository actually sends. Nothing here mocks the
 * pg driver.
 */

interface QueryCall {
  text: string;
  values: unknown[];
}

/** A raw audit_logs row as the driver hands it back (snake_case, TEXT states). */
interface RawRow {
  id: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before_state: string | null;
  after_state: string | null;
  occurred_at: Date;
}

function fakePool(rows: RawRow[]): { pool: Pool; calls: QueryCall[] } {
  const calls: QueryCall[] = [];
  const pool = {
    query: async (text: string, values: unknown[]) => {
      calls.push({ text, values });
      return { rows, rowCount: rows.length };
    },
  } as unknown as Pool;
  return { pool, calls };
}

function normalise(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim();
}

function row(overrides: Partial<RawRow> = {}): RawRow {
  return {
    id: 'audit-1',
    actor_id: 'emp-1',
    action: AuditAction.CREATE,
    entity_type: LEAVE_REQUEST_ENTITY_TYPE,
    entity_id: 'req-1',
    before_state: null,
    after_state: JSON.stringify({ status: 'DRAFT' }),
    occurred_at: new Date('2026-05-01T10:00:00.000Z'),
    ...overrides,
  };
}

describe('PgAuditLogRepository.findByEntity — the entity-scoped trail read', () => {
  it('issues the entity-scoped query with the canonical ordering', async () => {
    const { pool, calls } = fakePool([row()]);
    const repository = new PgAuditLogRepository(pool);

    await repository.findByEntity(LEAVE_REQUEST_ENTITY_TYPE, 'req-1');

    expect(calls).toHaveLength(1);
    const sql = normalise(calls[0].text);
    expect(sql).toContain('FROM audit_logs');
    expect(sql).toContain('WHERE entity_type = $1 AND entity_id = $2');
    expect(sql).toContain('ORDER BY occurred_at ASC, id ASC');
    // The shared COLUMNS projection findById already returns — one mapping, one shape.
    expect(sql).toContain(
      'id, actor_id, action, entity_type, entity_id, before_state, after_state, occurred_at'
    );
    expect(calls[0].values).toEqual([LEAVE_REQUEST_ENTITY_TYPE, 'req-1']);
  });

  it('takes no trailing PoolClient — the read path opens no transaction and joins none', () => {
    expect(PgAuditLogRepository.prototype.findByEntity.length).toBe(2);
  });

  it('maps rows through the existing mapRow: JSON parsed, null column null, occurred_at a Date', async () => {
    const { pool } = fakePool([row()]);
    const repository = new PgAuditLogRepository(pool);

    const entries = await repository.findByEntity(LEAVE_REQUEST_ENTITY_TYPE, 'req-1');

    expect(entries).toHaveLength(1);
    // after_state is TEXT holding JSON — the parsed value, not the raw string.
    expect(entries[0].afterState).toEqual({ status: 'DRAFT' });
    expect(typeof entries[0].afterState).toBe('object');
    expect(entries[0].beforeState).toBeNull();
    expect(entries[0].occurredAt).toBeInstanceOf(Date);
    expect(entries[0].occurredAt.toISOString()).toBe('2026-05-01T10:00:00.000Z');
  });

  it('parses beforeState and leaves a null afterState null (both directions)', async () => {
    const { pool } = fakePool([
      row({ before_state: JSON.stringify({ status: 'SUBMITTED' }), after_state: null }),
    ]);
    const repository = new PgAuditLogRepository(pool);

    const entries = await repository.findByEntity(LEAVE_REQUEST_ENTITY_TYPE, 'req-1');

    expect(entries[0].beforeState).toEqual({ status: 'SUBMITTED' });
    expect(entries[0].afterState).toBeNull();
  });

  it('returns an entry structurally identical to findById — the same eight fields, no extra', async () => {
    const { pool } = fakePool([row()]);
    const repository = new PgAuditLogRepository(pool);

    const [fromTrail] = await repository.findByEntity(LEAVE_REQUEST_ENTITY_TYPE, 'req-1');
    const fromId = await repository.findById('audit-1');

    expect(fromTrail).toEqual(fromId);
    expect(Object.keys(fromTrail).sort()).toEqual(
      [
        'id',
        'actorId',
        'action',
        'entityType',
        'entityId',
        'beforeState',
        'afterState',
        'occurredAt',
      ].sort()
    );
  });

  it('preserves ascending id order for rows sharing an occurredAt, and is stable on repeat', async () => {
    const tiedAt = new Date('2026-05-01T10:00:00.000Z');
    // What PostgreSQL returns for `ORDER BY occurred_at ASC, id ASC` when timestamps tie.
    const ordered = [
      row({ id: 'audit-a', occurred_at: tiedAt }),
      row({ id: 'audit-b', occurred_at: tiedAt }),
      row({ id: 'audit-c', occurred_at: tiedAt }),
    ];
    const { pool, calls } = fakePool(ordered);
    const repository = new PgAuditLogRepository(pool);

    const first = await repository.findByEntity(LEAVE_REQUEST_ENTITY_TYPE, 'req-1');
    const second = await repository.findByEntity(LEAVE_REQUEST_ENTITY_TYPE, 'req-1');

    expect(first.map((e) => e.id)).toEqual(['audit-a', 'audit-b', 'audit-c']);
    // Stability: the same input returns the same order on a repeat call.
    expect(second.map((e) => e.id)).toEqual(first.map((e) => e.id));
    // The tie-break lives in the query — no caller may re-sort.
    expect(normalise(calls[0].text)).toContain('ORDER BY occurred_at ASC, id ASC');
  });

  it('does not re-sort: rows come back in the order the query returned them', async () => {
    // Descending ids with ascending timestamps — a repository that sorted by id would
    // "fix" this and hide the SQL ordering asserted above.
    const { pool } = fakePool([
      row({ id: 'audit-z', occurred_at: new Date('2026-05-01T09:00:00.000Z') }),
      row({ id: 'audit-a', occurred_at: new Date('2026-05-01T10:00:00.000Z') }),
    ]);
    const repository = new PgAuditLogRepository(pool);

    const entries = await repository.findByEntity(LEAVE_REQUEST_ENTITY_TYPE, 'req-1');

    expect(entries.map((e) => e.id)).toEqual(['audit-z', 'audit-a']);
  });

  it('returns [] for an entity with no audit rows rather than throwing', async () => {
    const { pool } = fakePool([]);
    const repository = new PgAuditLogRepository(pool);

    await expect(
      repository.findByEntity(LEAVE_REQUEST_ENTITY_TYPE, 'req-with-no-trail')
    ).resolves.toEqual([]);
  });
});

function log(overrides: Partial<AuditLog> = {}): AuditLog {
  return {
    id: 'audit-1',
    actorId: 'emp-1',
    action: AuditAction.CREATE,
    entityType: LEAVE_REQUEST_ENTITY_TYPE,
    entityId: 'req-1',
    beforeState: null,
    afterState: { status: 'DRAFT' },
    occurredAt: new Date('2026-05-01T10:00:00.000Z'),
    ...overrides,
  };
}

class FakeAuditRepository implements IAuditRepository {
  rows: AuditLog[] = [];
  findByEntityCalls: { entityType: string; entityId: string }[] = [];

  async create(): Promise<AuditLog> {
    throw new Error('create is not exercised by the trail read');
  }

  async findById(): Promise<AuditLog | null> {
    return null;
  }

  async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    this.findByEntityCalls.push({ entityType, entityId });
    return this.rows.filter((r) => r.entityType === entityType && r.entityId === entityId);
  }
}

describe('AuditService.getByEntity — the service-level trail read', () => {
  let repository: FakeAuditRepository;
  let service: AuditService;

  beforeEach(() => {
    repository = new FakeAuditRepository();
    service = new AuditService(repository);
  });

  it('returns the repository rows verbatim — no filter, no re-sort, no cap', async () => {
    repository.rows = [
      log({ id: 'audit-late', occurredAt: new Date('2026-05-01T12:00:00.000Z') }),
      log({ id: 'audit-early', occurredAt: new Date('2026-05-01T08:00:00.000Z') }),
      log({ id: 'audit-other', entityId: 'req-2' }),
    ];

    const entries = await service.getByEntity(LEAVE_REQUEST_ENTITY_TYPE, 'req-1');

    expect(entries.map((e) => e.id)).toEqual(['audit-late', 'audit-early']);
  });

  it('returns an empty array for a visible entity with no rows — never NotFoundError', async () => {
    await expect(service.getByEntity(LEAVE_REQUEST_ENTITY_TYPE, 'req-1')).resolves.toEqual([]);
  });

  it('rejects a whitespace-only entityType or entityId without reaching the repository', async () => {
    await expect(service.getByEntity('   ', 'req-1')).rejects.toThrow(ValidationError);
    await expect(service.getByEntity(LEAVE_REQUEST_ENTITY_TYPE, '')).rejects.toThrow(
      ValidationError
    );
    expect(repository.findByEntityCalls).toHaveLength(0);
  });
});
