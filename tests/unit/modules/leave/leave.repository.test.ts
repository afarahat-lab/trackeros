import { PgLeaveRequestRepository } from '../../../../src/modules/leave/leave.repository';
import type { LeaveRequest } from '../../../../src/modules/leave/leave.model';
import { LeaveRequestStatus } from '../../../../src/shared/types/enums';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

import { pool } from '../../../../src/shared/db/connection';

const mockQuery = pool.query as jest.Mock;

function makeRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: overrides.id ?? 'lr-001',
    employee_id: overrides.employee_id ?? 'emp-001',
    leave_policy_id: overrides.leave_policy_id ?? 'pol-001',
    start_date: overrides.start_date ?? new Date('2026-07-01T00:00:00Z'),
    end_date: overrides.end_date ?? new Date('2026-07-03T00:00:00Z'),
    reason: overrides.reason ?? 'Vacation',
    status: overrides.status ?? LeaveRequestStatus.DRAFT,
    approved_by: (overrides.approved_by ?? null) as string | null,
    approved_at: (overrides.approved_at ?? null) as Date | null,
    rejected_by: (overrides.rejected_by ?? null) as string | null,
    rejected_at: (overrides.rejected_at ?? null) as Date | null,
    rejection_reason: (overrides.rejection_reason ?? null) as string | null,
    cancelled_by: (overrides.cancelled_by ?? null) as string | null,
    cancelled_at: (overrides.cancelled_at ?? null) as Date | null,
    created_at: overrides.created_at ?? new Date('2026-06-15T00:00:00Z'),
    updated_at: overrides.updated_at ?? new Date('2026-06-15T00:00:00Z'),
  };
}

function makeEntity(overrides: Partial<LeaveRequest> = {}): LeaveRequest {
  return {
    id: 'lr-001',
    employeeId: 'emp-001',
    leavePolicyId: 'pol-001',
    startDate: new Date('2026-07-01T00:00:00Z'),
    endDate: new Date('2026-07-03T00:00:00Z'),
    reason: 'Vacation',
    status: LeaveRequestStatus.DRAFT,
    approvedBy: null,
    approvedAt: null,
    rejectedBy: null,
    rejectedAt: null,
    rejectionReason: null,
    cancelledBy: null,
    cancelledAt: null,
    createdAt: new Date('2026-06-15T00:00:00Z'),
    updatedAt: new Date('2026-06-15T00:00:00Z'),
    ...overrides,
  };
}

describe('PgLeaveRequestRepository', () => {
  let repo: PgLeaveRequestRepository;

  beforeEach(() => {
    repo = new PgLeaveRequestRepository();
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return a LeaveRequest when a row matches', async () => {
      const row = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 } as never);

      const result = await repo.findById('lr-001');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('lr-001');
      expect(result!.employeeId).toBe('emp-001');
      expect(result!.leavePolicyId).toBe('pol-001');
      expect(result!.startDate).toEqual(new Date('2026-07-01T00:00:00Z'));
      expect(result!.endDate).toEqual(new Date('2026-07-03T00:00:00Z'));
      expect(result!.reason).toBe('Vacation');
      expect(result!.status).toBe(LeaveRequestStatus.DRAFT);
      expect(result!.approvedBy).toBeNull();
      expect(result!.approvedAt).toBeNull();
      expect(result!.rejectedBy).toBeNull();
      expect(result!.rejectedAt).toBeNull();
      expect(result!.rejectionReason).toBeNull();
      expect(result!.cancelledBy).toBeNull();
      expect(result!.cancelledAt).toBeNull();
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE id = $1',
        ['lr-001'],
      );
    });

    it('should return null when no row matches', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should reject on a pool error', async () => {
      const error = new Error('Connection refused');
      mockQuery.mockRejectedValueOnce(error);

      await expect(repo.findById('lr-001')).rejects.toThrow('Connection refused');
    });
  });

  describe('findByEmployeeId', () => {
    it('should return an array of LeaveRequest for matching rows', async () => {
      const row1 = makeRow({ id: 'lr-001' });
      const row2 = makeRow({ id: 'lr-002', status: LeaveRequestStatus.SUBMITTED });
      mockQuery.mockResolvedValueOnce({ rows: [row1, row2], rowCount: 2 } as never);

      const result = await repo.findByEmployeeId('emp-001');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('lr-001');
      expect(result[0].status).toBe(LeaveRequestStatus.DRAFT);
      expect(result[1].id).toBe('lr-002');
      expect(result[1].status).toBe(LeaveRequestStatus.SUBMITTED);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE employee_id = $1',
        ['emp-001'],
      );
    });

    it('should return an empty array when no rows match', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const result = await repo.findByEmployeeId('emp-999');

      expect(result).toEqual([]);
    });

    it('should reject on a pool error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Query timeout'));

      await expect(repo.findByEmployeeId('emp-001')).rejects.toThrow('Query timeout');
    });
  });

  describe('findByStatus', () => {
    it('should return an array of LeaveRequest for matching status', async () => {
      const row1 = makeRow({ id: 'lr-001', status: LeaveRequestStatus.SUBMITTED });
      const row2 = makeRow({ id: 'lr-002', status: LeaveRequestStatus.SUBMITTED });
      mockQuery.mockResolvedValueOnce({ rows: [row1, row2], rowCount: 2 } as never);

      const result = await repo.findByStatus(LeaveRequestStatus.SUBMITTED);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('lr-001');
      expect(result[0].status).toBe(LeaveRequestStatus.SUBMITTED);
      expect(result[1].id).toBe('lr-002');
      expect(result[1].status).toBe(LeaveRequestStatus.SUBMITTED);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE status = $1',
        ['SUBMITTED'],
      );
    });

    it('should return an empty array when no rows match the status', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const result = await repo.findByStatus(LeaveRequestStatus.APPROVED);

      expect(result).toEqual([]);
    });

    it('should reject on a pool error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Query timeout'));

      await expect(repo.findByStatus(LeaveRequestStatus.SUBMITTED)).rejects.toThrow('Query timeout');
    });
  });

  describe('findByEmployeeAndDateRange', () => {
    it('should return overlapping LeaveRequests for the given employee and date range', async () => {
      const row = makeRow({
        id: 'lr-001',
        start_date: new Date('2026-07-01T00:00:00Z'),
        end_date: new Date('2026-07-10T00:00:00Z'),
      });
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 } as never);

      const result = await repo.findByEmployeeAndDateRange(
        'emp-001',
        new Date('2026-07-05T00:00:00Z'),
        new Date('2026-07-15T00:00:00Z'),
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('lr-001');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM leave_requests'),
        ['emp-001', expect.any(Date), expect.any(Date)],
      );
    });

    it('should return an empty array when no overlapping rows are found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const result = await repo.findByEmployeeAndDateRange(
        'emp-001',
        new Date('2026-08-01T00:00:00Z'),
        new Date('2026-08-05T00:00:00Z'),
      );

      expect(result).toEqual([]);
    });

    it('should reject on a pool error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(
        repo.findByEmployeeAndDateRange(
          'emp-001',
          new Date('2026-07-01T00:00:00Z'),
          new Date('2026-07-05T00:00:00Z'),
        ),
      ).rejects.toThrow('Connection refused');
    });
  });

  describe('create', () => {
    const input: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'> = {
      employeeId: 'emp-001',
      leavePolicyId: 'pol-001',
      startDate: new Date('2026-07-01T00:00:00Z'),
      endDate: new Date('2026-07-03T00:00:00Z'),
      reason: 'Vacation',
      status: LeaveRequestStatus.DRAFT,
      approvedBy: null,
      approvedAt: null,
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
      cancelledBy: null,
      cancelledAt: null,
    };

    it('should insert and return a fully-populated LeaveRequest', async () => {
      const returnedRow = makeRow({
        id: 'generated-id',
        employee_id: 'emp-001',
        leave_policy_id: 'pol-001',
        start_date: new Date('2026-07-01T00:00:00Z'),
        end_date: new Date('2026-07-03T00:00:00Z'),
        reason: 'Vacation',
        status: LeaveRequestStatus.DRAFT,
        created_at: new Date('2026-06-15T00:00:00Z'),
        updated_at: new Date('2026-06-15T00:00:00Z'),
      });
      mockQuery.mockResolvedValueOnce({ rows: [returnedRow], rowCount: 1 } as never);

      const result = await repo.create(input);

      expect(result.id).toBe('generated-id');
      expect(result.employeeId).toBe('emp-001');
      expect(result.leavePolicyId).toBe('pol-001');
      expect(result.startDate).toEqual(new Date('2026-07-01T00:00:00Z'));
      expect(result.endDate).toEqual(new Date('2026-07-03T00:00:00Z'));
      expect(result.reason).toBe('Vacation');
      expect(result.status).toBe(LeaveRequestStatus.DRAFT);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();

      const queryCall = mockQuery.mock.calls[0];
      expect(queryCall[0]).toContain('INSERT INTO leave_requests');
      expect(queryCall[1][1]).toBe('emp-001');
      expect(queryCall[1][2]).toBe('pol-001');
      expect(queryCall[1][5]).toBe('Vacation');
      expect(queryCall[1][6]).toBe(LeaveRequestStatus.DRAFT);
    });

    it('should handle undefined reason by storing null', async () => {
      const inputWithoutReason = { ...input, reason: undefined };
      const returnedRow = {
        id: 'gen-002',
        employee_id: 'emp-001',
        leave_policy_id: 'pol-001',
        start_date: new Date('2026-07-01T00:00:00Z'),
        end_date: new Date('2026-07-03T00:00:00Z'),
        reason: null,
        status: LeaveRequestStatus.DRAFT,
        approved_by: null,
        approved_at: null,
        rejected_by: null,
        rejected_at: null,
        rejection_reason: null,
        cancelled_by: null,
        cancelled_at: null,
        created_at: new Date('2026-06-15T00:00:00Z'),
        updated_at: new Date('2026-06-15T00:00:00Z'),
      };
      mockQuery.mockResolvedValueOnce({ rows: [returnedRow], rowCount: 1 } as never);

      const result = await repo.create(inputWithoutReason);

      expect(result.reason).toBeUndefined();
      const queryCall = mockQuery.mock.calls[0];
      expect(queryCall[1][5]).toBeNull();
    });

    it('should reject on a unique-constraint violation', async () => {
      const error = new Error('duplicate key value violates unique constraint');
      mockQuery.mockRejectedValueOnce(error);

      await expect(repo.create(input)).rejects.toThrow('duplicate key value');
    });

    it('should reject on a pool error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(repo.create(input)).rejects.toThrow('Connection refused');
    });
  });

  describe('update', () => {
    it('should update and return the merged LeaveRequest', async () => {
      const existingRow = makeRow({ id: 'lr-001', status: LeaveRequestStatus.DRAFT });
      mockQuery.mockResolvedValueOnce({ rows: [existingRow], rowCount: 1 } as never);

      const updatedRow = makeRow({
        id: 'lr-001',
        status: LeaveRequestStatus.SUBMITTED,
        updated_at: new Date('2026-07-01T00:00:00Z'),
      });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow], rowCount: 1 } as never);

      const result = await repo.update('lr-001', { status: LeaveRequestStatus.SUBMITTED });

      expect(result).not.toBeNull();
      expect(result!.id).toBe('lr-001');
      expect(result!.status).toBe(LeaveRequestStatus.SUBMITTED);
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should return null when the id does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const result = await repo.update('nonexistent', { status: LeaveRequestStatus.SUBMITTED });

      expect(result).toBeNull();
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('should reject on a pool error during findById', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(repo.update('lr-001', { status: LeaveRequestStatus.SUBMITTED })).rejects.toThrow(
        'Connection refused',
      );
    });

    it('should reject on a pool error during update', async () => {
      const existingRow = makeRow({ id: 'lr-001' });
      mockQuery.mockResolvedValueOnce({ rows: [existingRow], rowCount: 1 } as never);
      mockQuery.mockRejectedValueOnce(new Error('Write error'));

      await expect(repo.update('lr-001', { status: LeaveRequestStatus.SUBMITTED })).rejects.toThrow(
        'Write error',
      );
    });
  });
});
