import { LeaveRepository } from '../../../../src/modules/leave/leave.repository';
import { LeaveRequest } from '../../../../src/modules/leave/leave.model';
import { Pool, PoolClient } from 'pg';

jest.mock('../../../../src/shared/db/connection', () => {
  const mockPool = {
    query: jest.fn(),
  };
  return { pool: mockPool as unknown as Pool };
});

import { pool } from '../../../../src/shared/db/connection';

function makeLeaveRequestRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: 'lr-1',
    employee_id: 'emp-1',
    leave_policy_id: 'pol-1',
    start_date: '2026-08-10T00:00:00.000Z',
    end_date: '2026-08-14T00:00:00.000Z',
    reason: 'Vacation',
    status: 'SUBMITTED',
    approved_by: null,
    approved_at: null,
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

function expectedLeaveRequest(overrides: Partial<LeaveRequest> = {}): LeaveRequest {
  return {
    id: 'lr-1',
    employeeId: 'emp-1',
    leavePolicyId: 'pol-1',
    startDate: new Date('2026-08-10T00:00:00.000Z'),
    endDate: new Date('2026-08-14T00:00:00.000Z'),
    reason: 'Vacation',
    status: 'SUBMITTED',
    approvedBy: null,
    approvedAt: null,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('LeaveRepository', () => {
  let repo: LeaveRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new LeaveRepository();
  });

  describe('findById', () => {
    it('should return a leave request when found', async () => {
      const row = makeLeaveRequestRow();
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findById('lr-1');

      expect(result).toEqual(expectedLeaveRequest());
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE id = $1',
        ['lr-1'],
      );
    });

    it('should return null when not found', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmployee', () => {
    it('should return all leave requests for the given employee ordered by start_date DESC', async () => {
      const row1 = makeLeaveRequestRow();
      const row2 = makeLeaveRequestRow({
        id: 'lr-2',
        start_date: '2026-09-01T00:00:00.000Z',
        end_date: '2026-09-03T00:00:00.000Z',
      });
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [row2, row1] });

      const result = await repo.findByEmployee('emp-1');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(
        expectedLeaveRequest({
          id: 'lr-2',
          startDate: new Date('2026-09-01T00:00:00.000Z'),
          endDate: new Date('2026-09-03T00:00:00.000Z'),
        }),
      );
      expect(result[1]).toEqual(expectedLeaveRequest());
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE employee_id = $1 ORDER BY start_date DESC',
        ['emp-1'],
      );
    });

    it('should return empty array when no requests exist', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployee('emp-1');

      expect(result).toEqual([]);
    });
  });

  describe('findByEmployeeAndStatus', () => {
    it('should return requests filtered by employee and status', async () => {
      const row = makeLeaveRequestRow({ status: 'APPROVED' });
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findByEmployeeAndStatus('emp-1', 'APPROVED');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expectedLeaveRequest({ status: 'APPROVED' }));
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE employee_id = $1 AND status = $2 ORDER BY start_date DESC',
        ['emp-1', 'APPROVED'],
      );
    });

    it('should return empty array when no matching requests', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployeeAndStatus('emp-1', 'REJECTED');

      expect(result).toEqual([]);
    });
  });

  describe('findOverlapping', () => {
    it('should return overlapping SUBMITTED/APPROVED requests for the same employee', async () => {
      const row = makeLeaveRequestRow({ status: 'APPROVED' });
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findOverlapping(
        'emp-1',
        new Date('2026-08-12T00:00:00.000Z'),
        new Date('2026-08-16T00:00:00.000Z'),
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expectedLeaveRequest({ status: 'APPROVED' }));
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE employee_id = $1 AND status IN (\'SUBMITTED\', \'APPROVED\') AND start_date <= $3 AND end_date >= $2 ORDER BY start_date',
        ['emp-1', expect.any(Date), expect.any(Date)],
      );
    });

    it('should exclude a specific request id when excludeId is provided', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await repo.findOverlapping(
        'emp-1',
        new Date('2026-08-12T00:00:00.000Z'),
        new Date('2026-08-16T00:00:00.000Z'),
        'lr-1',
      );

      expect(result).toEqual([]);
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE employee_id = $1 AND status IN (\'SUBMITTED\', \'APPROVED\') AND start_date <= $3 AND end_date >= $2 AND id != $4 ORDER BY start_date',
        ['emp-1', expect.any(Date), expect.any(Date), 'lr-1'],
      );
    });

    it('should return empty array when no overlapping requests exist', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await repo.findOverlapping(
        'emp-1',
        new Date('2026-08-01T00:00:00.000Z'),
        new Date('2026-08-05T00:00:00.000Z'),
      );

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should insert and return a new leave request', async () => {
      const input: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'> = {
        employeeId: 'emp-1',
        leavePolicyId: 'pol-1',
        startDate: new Date('2026-08-10T00:00:00.000Z'),
        endDate: new Date('2026-08-14T00:00:00.000Z'),
        reason: 'Vacation',
        status: 'SUBMITTED',
        approvedBy: null,
        approvedAt: null,
      };

      const row = makeLeaveRequestRow();
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create(input);

      expect(result).toEqual(expectedLeaveRequest());
      expect(pool.query).toHaveBeenCalledTimes(1);
      const sql: string = (pool.query as jest.Mock).mock.calls[0][0];
      const params: unknown[] = (pool.query as jest.Mock).mock.calls[0][1];
      expect(sql).toContain('INSERT INTO leave_requests');
      expect(params[0]).toBe('emp-1');
      expect(params[1]).toBe('pol-1');
      expect(params[4]).toBe('Vacation');
      expect(params[5]).toBe('SUBMITTED');
      expect(params[6]).toBeNull();
      expect(params[7]).toBeNull();
    });

    it('should handle undefined reason', async () => {
      const input: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'> = {
        employeeId: 'emp-1',
        leavePolicyId: 'pol-1',
        startDate: new Date('2026-08-10T00:00:00.000Z'),
        endDate: new Date('2026-08-14T00:00:00.000Z'),
        reason: undefined,
        status: 'DRAFT',
        approvedBy: null,
        approvedAt: null,
      };

      const row = makeLeaveRequestRow({ reason: null, status: 'DRAFT' });
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create(input);

      expect(result.reason).toBeUndefined();
      expect(pool.query).toHaveBeenCalledTimes(1);
      const params: unknown[] = (pool.query as jest.Mock).mock.calls[0][1];
      expect(params[4]).toBeNull();
    });

    it('should handle approvedBy and approvedAt when set', async () => {
      const input: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'> = {
        employeeId: 'emp-1',
        leavePolicyId: 'pol-1',
        startDate: new Date('2026-08-10T00:00:00.000Z'),
        endDate: new Date('2026-08-14T00:00:00.000Z'),
        reason: 'Vacation',
        status: 'APPROVED',
        approvedBy: 'mgr-1',
        approvedAt: new Date('2026-08-02T00:00:00.000Z'),
      };

      const row = makeLeaveRequestRow({
        status: 'APPROVED',
        approved_by: 'mgr-1',
        approved_at: '2026-08-02T00:00:00.000Z',
      });
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create(input);

      expect(result.status).toBe('APPROVED');
      expect(result.approvedBy).toBe('mgr-1');
      expect(result.approvedAt).toEqual(new Date('2026-08-02T00:00:00.000Z'));
    });
  });

  describe('update', () => {
    it('should update and return the leave request', async () => {
      const existingRow = makeLeaveRequestRow();
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [existingRow] });

      const updatedRow = makeLeaveRequestRow({
        status: 'APPROVED',
        approved_by: 'mgr-1',
        approved_at: '2026-08-02T00:00:00.000Z',
        updated_at: '2026-08-02T00:00:00.000Z',
      });
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await repo.update('lr-1', {
        status: 'APPROVED',
        approvedBy: 'mgr-1',
        approvedAt: new Date('2026-08-02T00:00:00.000Z'),
      });

      expect(result).not.toBeNull();
      expect(result!.status).toBe('APPROVED');
      expect(result!.approvedBy).toBe('mgr-1');
      expect(result!.approvedAt).toEqual(new Date('2026-08-02T00:00:00.000Z'));
      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    it('should return null when leave request does not exist', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await repo.update('nonexistent', { reason: 'Updated' });

      expect(result).toBeNull();
    });

    it('should return existing request when no fields to update', async () => {
      const existingRow = makeLeaveRequestRow();
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [existingRow] });

      const result = await repo.update('lr-1', {});

      expect(result).toEqual(expectedLeaveRequest());
      expect(pool.query).toHaveBeenCalledTimes(1);
    });

    it('should not allow changing employeeId or leavePolicyId via update', async () => {
      const existingRow = makeLeaveRequestRow();
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [existingRow] });

      const result = await repo.update('lr-1', {
        employeeId: 'emp-other',
        leavePolicyId: 'pol-other',
      } as Partial<LeaveRequest>);

      expect(result).not.toBeNull();
      expect(result!.employeeId).toBe('emp-1');
      expect(result!.leavePolicyId).toBe('pol-1');
      expect(pool.query).toHaveBeenCalledTimes(1);
    });

    it('should set approvedBy and approvedAt to null', async () => {
      const existingRow = makeLeaveRequestRow({
        status: 'APPROVED',
        approved_by: 'mgr-1',
        approved_at: '2026-08-02T00:00:00.000Z',
      });
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [existingRow] });

      const updatedRow = makeLeaveRequestRow({
        status: 'CANCELLED',
        approved_by: null,
        approved_at: null,
        updated_at: '2026-08-03T00:00:00.000Z',
      });
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await repo.update('lr-1', {
        status: 'CANCELLED',
        approvedBy: null,
        approvedAt: null,
      });

      expect(result).not.toBeNull();
      expect(result!.status).toBe('CANCELLED');
      expect(result!.approvedBy).toBeNull();
      expect(result!.approvedAt).toBeNull();
    });
  });

  describe('findPendingByEmployee', () => {
    it('should return SUBMITTED requests for the given employee', async () => {
      const row = makeLeaveRequestRow({ status: 'SUBMITTED' });
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findPendingByEmployee('emp-1');

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('SUBMITTED');
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE employee_id = $1 AND status = \'SUBMITTED\' ORDER BY start_date DESC',
        ['emp-1'],
      );
    });

    it('should return empty array when no pending requests', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await repo.findPendingByEmployee('emp-1');

      expect(result).toEqual([]);
    });
  });

  describe('constructor with custom client', () => {
    it('should use the provided PoolClient instead of the default pool', async () => {
      const mockClient = { query: jest.fn() } as unknown as PoolClient;
      const clientRepo = new LeaveRepository(mockClient);

      const row = makeLeaveRequestRow();
      mockClient.query = jest.fn().mockResolvedValueOnce({ rows: [row] });

      const result = await clientRepo.findById('lr-1');

      expect(result).toEqual(expectedLeaveRequest());
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE id = $1',
        ['lr-1'],
      );
      expect(pool.query).not.toHaveBeenCalled();
    });
  });
});
