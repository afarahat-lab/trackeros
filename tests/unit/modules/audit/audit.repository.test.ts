import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PostgreSqlAuditRepository } from '../../../../src/modules/audit/audit.repository';

describe('SC-3: PostgreSqlAuditRepository', () => {
  it('creates an audit record and persists through pg pool query', async () => {
    const query = vi.fn().mockResolvedValue({ rowCount: 1 });
    const pool = { query };

    const repository = new PostgreSqlAuditRepository(pool as never);

    const result = await repository.createAuditRecord({
      entityType: 'LeaveRequest',
      entityId: 'leave-1',
      action: 'CREATED'
    });

    expect(result.entityId).toBe('leave-1');
    expect(result.action).toBe('CREATED');
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain('INSERT INTO audit_records');
  });

  it('wraps database errors', async () => {
    const pool = {
      query: vi.fn().mockRejectedValue(new Error('db failed'))
    };

    const repository = new PostgreSqlAuditRepository(pool as never);

    await expect(
      repository.createAuditRecord({
        entityType: 'LeaveRequest',
        entityId: 'leave-1',
        action: 'CREATED'
      })
    ).rejects.toThrow(/AUDIT_RECORD_CREATE_FAILED/);
  });
});