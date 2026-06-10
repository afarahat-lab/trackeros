import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('crypto', () => ({
  randomUUID: () => 'leave-id-123'
}));

import { PostgreSqlLeaveRepository } from '../../../../src/modules/leave/leave.repository';

type QueryResultRow = {
  id: string;
  employee_id: string;
  leave_type: string;
  status: string;
};

describe('SC-4: leave.repository contract', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes createLeaveRequest, findById and updateStatus methods', () => {
    const pool = { query: vi.fn() };
    const auditRepository = { createAuditRecord: vi.fn() };

    const repository = new PostgreSqlLeaveRepository(pool as never, auditRepository as never);

    expect(typeof repository.createLeaveRequest).toBe('function');
    expect(typeof repository.findById).toBe('function');
    expect(typeof repository.updateStatus).toBe('function');
  });
});

describe('SC-5: createLeaveRequest persistence and audit creation', () => {
  let pool: { query: ReturnType<typeof vi.fn> };
  let auditRepository: { createAuditRecord: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    pool = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    auditRepository = { createAuditRecord: vi.fn().mockResolvedValue({}) };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('persists a PENDING leave request and writes CREATED audit record', async () => {
    const repository = new PostgreSqlLeaveRepository(pool as never, auditRepository as never);

    const result = await repository.createLeaveRequest({
      employeeId: 'emp-1',
      leaveType: 'VACATION'
    });

    expect(result.id).toBe('leave-id-123');
    expect(result.employeeId).toBe('emp-1');
    expect(result.status).toBe('PENDING');

    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(auditRepository.createAuditRecord).toHaveBeenCalledWith({
      entityType: 'LeaveRequest',
      entityId: 'leave-id-123',
      action: 'CREATED'
    });
  });

  it('wraps database errors', async () => {
    pool.query.mockRejectedValue(new Error('db_down'));

    const repository = new PostgreSqlLeaveRepository(pool as never, auditRepository as never);

    await expect(
      repository.createLeaveRequest({ employeeId: 'emp-1', leaveType: 'VACATION' })
    ).rejects.toThrow(/LEAVE_REQUEST_CREATE_FAILED/);
  });
});

describe('SC-6: createLeaveRequest and findById behavior', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('findById returns the persisted leave request', async () => {
    const row: QueryResultRow = {
      id: 'leave-id-123',
      employee_id: 'emp-1',
      leave_type: 'VACATION',
      status: 'PENDING'
    };

    const pool = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [row] })
    };

    const auditRepository = { createAuditRecord: vi.fn().mockResolvedValue({}) };

    const repository = new PostgreSqlLeaveRepository(pool as never, auditRepository as never);

    await repository.createLeaveRequest({ employeeId: 'emp-1', leaveType: 'VACATION' });

    const found = await repository.findById('leave-id-123');

    expect(found).not.toBeNull();
    expect(found?.id).toBe('leave-id-123');
    expect(found?.status).toBe('PENDING');
  });

  it('returns null when leave request is not found', async () => {
    const pool = {
      query: vi.fn().mockResolvedValue({ rows: [] })
    };

    const auditRepository = { createAuditRecord: vi.fn() };
    const repository = new PostgreSqlLeaveRepository(pool as never, auditRepository as never);

    const found = await repository.findById('missing');

    expect(found).toBeNull();
  });
});