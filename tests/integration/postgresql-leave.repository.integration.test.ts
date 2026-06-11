import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../src/shared/db/connection', () => ({
  default: { query: vi.fn() }
}));

import pool from '../../src/shared/db/connection';
import { PostgreSqlLeaveRequestRepository } from '../../src/modules/leave/postgresql-leave.repository';

describe('SC-6: repository behaviors', () => {
  const repo = new PostgreSqlLeaveRequestRepository();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('create returns mapped row', async () => {
    const mockedPool = pool as { query: ReturnType<typeof vi.fn> };
    mockedPool.query.mockResolvedValueOnce({ rows: [{ id: '1', employee_id: 'e1', leave_type: 'ANNUAL', start_date: new Date(), end_date: new Date(), status: 'PENDING', created_at: new Date(), updated_at: new Date() }] });

    const result = await repo.create({ id: '1', employeeId: 'e1', leaveType: 'ANNUAL', startDate: new Date(), endDate: new Date(), status: 'PENDING', createdAt: new Date(), updatedAt: new Date() });
    expect(result).not.toBeNull();
  });

  it('findById returns null when no row exists', async () => {
    const mockedPool = pool as { query: ReturnType<typeof vi.fn> };
    mockedPool.query.mockResolvedValueOnce({ rows: [] });
    await expect(repo.findById('missing')).resolves.toBeNull();
  });

  it('findByEmployeeId returns collection', async () => {
    const mockedPool = pool as { query: ReturnType<typeof vi.fn> };
    mockedPool.query.mockResolvedValueOnce({ rows: [] });
    const result = await repo.findByEmployeeId('e1');
    expect(Array.isArray(result)).toBe(true);
  });

  it('update propagates updated entity', async () => {
    const mockedPool = pool as { query: ReturnType<typeof vi.fn> };
    mockedPool.query.mockResolvedValueOnce({ rows: [{ id: '1', employee_id: 'e1', leave_type: 'ANNUAL', start_date: new Date(), end_date: new Date(), status: 'APPROVED', created_at: new Date(), updated_at: new Date() }] });

    const result = await repo.update({ id: '1', employeeId: 'e1', leaveType: 'ANNUAL', startDate: new Date(), endDate: new Date(), status: 'APPROVED', createdAt: new Date(), updatedAt: new Date() });
    expect(result).not.toBeNull();
  });
});