import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../../../src/shared/db/connection', () => ({
  default: {
    query: vi.fn()
  }
}));

import pool from '../../../../src/shared/db/connection';
import { PostgreSqlLeaveRequestRepository } from '../../../../src/modules/leave/postgresql-leave.repository';
import fs from 'node:fs';
import path from 'node:path';

const sample = {
  id: '1',
  employeeId: 'emp-1',
  leaveType: 'ANNUAL' as const,
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-01-02'),
  status: 'PENDING' as const,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01')
};

describe('SC-3: PostgreSqlLeaveRequestRepository implementation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('can be instantiated and implements repository operations', () => {
    const repository = new PostgreSqlLeaveRequestRepository();
    expect(typeof repository.create).toBe('function');
    expect(typeof repository.findById).toBe('function');
    expect(typeof repository.findByEmployeeId).toBe('function');
    expect(typeof repository.update).toBe('function');
  });

  it('wraps database errors', async () => {
    const repository = new PostgreSqlLeaveRequestRepository();
    vi.mocked(pool.query).mockRejectedValueOnce(new Error('db failure'));
    await expect(repository.findById('bad-id')).rejects.toThrow('LeaveRequestRepository#findById failed');
  });
});

describe('SC-4: leave_requests schema definition', () => {
  it('contains required leave_requests columns in repository SQL', () => {
    const file = fs.readFileSync(path.resolve(process.cwd(), 'src/modules/leave/postgresql-leave.repository.ts'), 'utf8');
    expect(file).toContain('leave_requests');
    expect(file).toContain('id');
    expect(file).toContain('employee_id');
    expect(file).toContain('leave_type');
    expect(file).toContain('start_date');
    expect(file).toContain('end_date');
    expect(file).toContain('status');
    expect(file).toContain('created_at');
    expect(file).toContain('updated_at');
  });
});

describe('SC-5: repository create/find/update behaviour', () => {
  const repository = new PostgreSqlLeaveRequestRepository();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a leave request', async () => {
    vi.mocked(pool.query).mockResolvedValueOnce({
      rows: [{
        id: sample.id,
        employee_id: sample.employeeId,
        leave_type: sample.leaveType,
        start_date: sample.startDate,
        end_date: sample.endDate,
        status: sample.status,
        created_at: sample.createdAt,
        updated_at: sample.updatedAt
      }]
    } as never);

    const result = await repository.create(sample);
    expect(result.employeeId).toBe('emp-1');
  });

  it('finds by id and returns null when not found', async () => {
    vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] } as never);
    await expect(repository.findById('missing')).resolves.toBeNull();
  });

  it('finds by employee id', async () => {
    vi.mocked(pool.query).mockResolvedValueOnce({
      rows: [{
        id: sample.id,
        employee_id: sample.employeeId,
        leave_type: sample.leaveType,
        start_date: sample.startDate,
        end_date: sample.endDate,
        status: sample.status,
        created_at: sample.createdAt,
        updated_at: sample.updatedAt
      }]
    } as never);

    const results = await repository.findByEmployeeId(sample.employeeId);
    expect(results).toHaveLength(1);
    expect(results[0].employeeId).toBe(sample.employeeId);
  });

  it('updates a leave request', async () => {
    vi.mocked(pool.query).mockResolvedValueOnce({
      rows: [{
        id: sample.id,
        employee_id: sample.employeeId,
        leave_type: sample.leaveType,
        start_date: sample.startDate,
        end_date: sample.endDate,
        status: 'APPROVED',
        created_at: sample.createdAt,
        updated_at: sample.updatedAt
      }]
    } as never);

    const result = await repository.update({ ...sample, status: 'APPROVED' });
    expect(result.status).toBe('APPROVED');
  });
});