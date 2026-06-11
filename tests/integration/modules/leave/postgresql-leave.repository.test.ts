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
  leaveType: 'ANNUAL',
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-01-02'),
  status: 'PENDING',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01')
};

describe('SC-4: leave_requests persistence schema', () => {
  it('contains required database column names in repository SQL', () => {
    const filePath = path.resolve(process.cwd(), 'src/modules/leave/postgresql-leave.repository.ts');
    const content = fs.readFileSync(filePath, 'utf8');

    expect(content).toContain('leave_requests');
    expect(content).toContain('id');
    expect(content).toContain('employee_id');
    expect(content).toContain('leave_type');
    expect(content).toContain('start_date');
    expect(content).toContain('end_date');
    expect(content).toContain('status');
    expect(content).toContain('created_at');
    expect(content).toContain('updated_at');
  });
});

describe('SC-5: repository behavior coverage', () => {
  const repository = new PostgreSqlLeaveRequestRepository();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a leave request', async () => {
    vi.mocked(pool.query).mockResolvedValueOnce({ rows: [{
      id: sample.id,
      employee_id: sample.employeeId,
      leave_type: sample.leaveType,
      start_date: sample.startDate,
      end_date: sample.endDate,
      status: sample.status,
      created_at: sample.createdAt,
      updated_at: sample.updatedAt
    }] } as never);

    const result = await repository.create(sample);
    expect(result.id).toBe('1');
  });

  it('finds by id and returns null when not found', async () => {
    vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] } as never);
    await expect(repository.findById('missing')).resolves.toBeNull();
  });

  it('finds by employee id', async () => {
    vi.mocked(pool.query).mockResolvedValueOnce({ rows: [{
      id: sample.id,
      employee_id: sample.employeeId,
      leave_type: sample.leaveType,
      start_date: sample.startDate,
      end_date: sample.endDate,
      status: sample.status,
      created_at: sample.createdAt,
      updated_at: sample.updatedAt
    }] } as never);

    const result = await repository.findByEmployeeId(sample.employeeId);
    expect(result).toHaveLength(1);
  });

  it('updates a leave request', async () => {
    vi.mocked(pool.query).mockResolvedValueOnce({ rows: [{
      id: sample.id,
      employee_id: sample.employeeId,
      leave_type: sample.leaveType,
      start_date: sample.startDate,
      end_date: sample.endDate,
      status: 'APPROVED',
      created_at: sample.createdAt,
      updated_at: sample.updatedAt
    }] } as never);

    const result = await repository.update({ ...sample, status: 'APPROVED' });
    expect(result.status).toBe('APPROVED');
  });

  it('propagates database errors', async () => {
    vi.mocked(pool.query).mockRejectedValueOnce(new Error('db failure'));

    await expect(repository.findByEmployeeId('emp-1')).rejects.toThrow('db failure');
  });
});