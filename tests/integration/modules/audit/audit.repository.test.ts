import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PostgreSqlAuditRecordRepository } from '../../../../src/modules/audit/audit.repository';

vi.mock('crypto', () => ({ randomUUID: () => 'generated-audit-id' }));

describe('SC-3 PostgreSqlAuditRecordRepository', () => {
  beforeEach(() => {});
  afterEach(() => { vi.clearAllMocks(); });

  it('persists an audit record through a pg Pool', async () => {
    const pool = {
      query: vi.fn().mockResolvedValue({})
    };

    const repository = new PostgreSqlAuditRecordRepository(pool as never);

    const result = await repository.create({
      entityType: 'LeaveRequest',
      entityId: 'lr-1',
      action: 'CREATE',
      createdAt: new Date()
    } as never);

    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(result.id).toBe('generated-audit-id');
  });

  it('wraps persistence failures', async () => {
    const pool = {
      query: vi.fn().mockRejectedValue(new Error('db_down'))
    };

    const repository = new PostgreSqlAuditRecordRepository(pool as never);

    await expect(repository.create({
      entityType: 'LeaveRequest',
      entityId: 'lr-1',
      action: 'CREATE',
      createdAt: new Date()
    } as never)).rejects.toThrow('AUDIT_RECORD_CREATE_FAILED:db_down');
  });
});