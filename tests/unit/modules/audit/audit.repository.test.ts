import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { AuditRecord } from '../../../../src/modules/audit/audit.model';
import { PostgreSqlAuditRecordRepository } from '../../../../src/modules/audit/audit.repository';

describe('SC-2: audit model and repository', () => {
  beforeEach(() => {});
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates and persists an AuditRecord through PostgreSQL', async () => {
    const query = vi.fn().mockResolvedValue({ rowCount: 1 });
    const repository = new PostgreSqlAuditRecordRepository({ query } as never);

    const record: AuditRecord = {
      id: 'audit-1',
      entityType: 'LeaveRequest',
      entityId: 'leave-1',
      action: 'CREATE',
      createdAt: new Date('2024-01-01')
    };

    const result = await repository.create(record);

    expect(result).toEqual(record);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0]?.[0]).toContain('INSERT INTO audit_records');
  });

  it('generates an id when one is not provided', async () => {
    const query = vi.fn().mockResolvedValue({ rowCount: 1 });
    const repository = new PostgreSqlAuditRecordRepository({ query } as never);

    const result = await repository.create({
      id: '',
      entityType: 'LeaveRequest',
      entityId: 'leave-2',
      action: 'UPDATE',
      createdAt: new Date()
    });

    expect(result.id).toBeTypeOf('string');
    expect(result.id.length).toBeGreaterThan(0);
  });

  it('propagates database errors', async () => {
    const query = vi.fn().mockRejectedValue(new Error('db failure'));
    const repository = new PostgreSqlAuditRecordRepository({ query } as never);

    await expect(repository.create({
      id: 'audit-x',
      entityType: 'LeaveRequest',
      entityId: 'leave-x',
      action: 'DELETE',
      createdAt: new Date()
    })).rejects.toThrow('db failure');
  });
});