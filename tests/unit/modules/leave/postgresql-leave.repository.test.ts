import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../../../src/shared/db/connection', () => ({
  default: { query: vi.fn() }
}));

import pool from '../../../../src/shared/db/connection';
import { PostgreSqlLeaveRequestRepository } from '../../../../src/modules/leave/postgresql-leave.repository';

describe('SC-3: PostgreSqlLeaveRequestRepository implementation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports repository implementation with required methods', () => {
    const repo = new PostgreSqlLeaveRequestRepository();
    expect(typeof repo.create).toBe('function');
    expect(typeof repo.findById).toBe('function');
    expect(typeof repo.findByEmployeeId).toBe('function');
    expect(typeof repo.update).toBe('function');
  });

  it('wraps database errors', async () => {
    const mockedPool = pool as { query: ReturnType<typeof vi.fn> };
    mockedPool.query.mockRejectedValueOnce(new Error('db failure'));
    const repo = new PostgreSqlLeaveRequestRepository();

    await expect(repo.findById('x')).rejects.toThrow('LeaveRequestRepository#findById failed');
  });
});