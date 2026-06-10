import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('crypto', () => ({
  randomUUID: () => 'audit-id-123'
}));

import { PostgreSqlAuditRepository } from '../../../../src/modules/audit/audit.repository';

type QueryResult = { rows: unknown[] };

describe('SC-3: PostgreSqlAuditRepository', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates and persists an audit record through pool.query', async () => {
    const query = vi.fn<(...args: unknown[]) => Promise<QueryResult>>().mockResolvedValue({ rows: [] });
    const pool = { query };

    const repository = new PostgreSqlAuditRepository(pool as never);

    const record = await repository.createAuditRecord({
      entityType: 'LeaveRequest',
      entityId: 'leave-1',
      action: 'CREATED'
    });

    expect(record.id).toBe('audit-id-123');
    expect(record.entityId).toBe('leave-1');
    expect(record.action).toBe('CREATED');
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('wraps database errors', async () => {
    const query = vi.fn<(...args: unknown[]) => Promise<QueryResult>>().mockRejectedValue(new Error('db-error'));
    const pool = { query };

    const repository = new PostgreSqlAuditRepository(pool as never);

    await expect(
      repository.createAuditRecord({
        entityType: 'LeaveRequest',
        entityId: 'leave-1',
        action: 'CREATED'
      })
    ).rejects.toThrow('AUDIT_RECORD_CREATE_FAILED:db-error');
  });
});