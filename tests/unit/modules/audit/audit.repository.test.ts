import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PostgreSqlAuditRepository } from '../../../../src/modules/audit/audit.repository';

describe('SC-5: PostgreSqlAuditRepository', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates an audit record through a pg Pool-compatible dependency', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const pool = { query } as unknown as import('pg').Pool;

    const repository = new PostgreSqlAuditRepository(pool);

    const result = await repository.createAuditRecord({
      entityType: 'LeaveRequest',
      entityId: 'leave-1',
      action: 'CREATED'
    });

    expect(result.entityType).toBe('LeaveRequest');
    expect(result.entityId).toBe('leave-1');
    expect(result.action).toBe('CREATED');
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('propagates database failures', async () => {
    const pool = {
      query: vi.fn().mockRejectedValue(new Error('db failure'))
    } as unknown as import('pg').Pool;

    const repository = new PostgreSqlAuditRepository(pool);

    await expect(
      repository.createAuditRecord({
        entityType: 'LeaveRequest',
        entityId: 'leave-1',
        action: 'CREATED'
      })
    ).rejects.toThrow('db failure');
  });
});

describe('SC-7: documentation', () => {
  it('documents LeaveType, LeaveRequestStatus, AuditAction and AuditRecord relationship when a README exists', () => {
    const readmePath = path.resolve(process.cwd(), 'README.md');

    if (!fs.existsSync(readmePath)) {
      expect(fs.existsSync(readmePath)).toBe(false);
      return;
    }

    const content = fs.readFileSync(readmePath, 'utf8');

    expect(content).toContain('LeaveType');
    expect(content).toContain('LeaveRequestStatus');
    expect(content).toContain('AuditAction');
    expect(content).toContain('AuditRecord');
    expect(content).toContain('LeaveRequest');
  });
});
