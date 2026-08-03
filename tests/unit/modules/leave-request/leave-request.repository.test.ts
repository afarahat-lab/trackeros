import { Pool } from 'pg';
import { LeaveRequestRepository } from '../../../../src/modules/leave-request/leave-request.repository';
import { LeaveRequest, CreateLeaveRequestDto } from '../../../../src/modules/leave-request/leave-request.model';
import { LeaveRequestStatus } from '../../../../src/shared/types';

jest.mock('pg', () => {
  const mockQuery = jest.fn();
  return {
    Pool: jest.fn().mockImplementation(() => ({
      query: mockQuery,
    })),
  };
});

const mockLeaveRequestRow: Record<string, unknown> = {
  id: 'lr-001',
  employee_id: 'emp-001',
  leave_policy_id: 'lp-001',
  start_date: '2026-07-01T00:00:00.000Z',
  end_date: '2026-07-05T00:00:00.000Z',
  reason: 'Family vacation',
  status: 'DRAFT',
  approved_by: null,
  approved_at: null,
  created_at: '2026-06-15T00:00:00.000Z',
  updated_at: '2026-06-15T00:00:00.000Z',
};

const mockApprovedLeaveRequestRow: Record<string, unknown> = {
  id: 'lr-002',
  employee_id: 'emp-001',
  leave_policy_id: 'lp-001',
  start_date: '2026-08-10T00:00:00.000Z',
  end_date: '2026-08-12T00:00:00.000Z',
  reason: null,
  status: 'APPROVED',
  approved_by: 'emp-002',
  approved_at: '2026-07-20T00:00:00.000Z',
  created_at: '2026-07-15T00:00:00.000Z',
  updated_at: '2026-07-20T00:00:00.000Z',
};

const mockRejectedLeaveRequestRow: Record<string, unknown> = {
  id: 'lr-003',
  employee_id: 'emp-003',
  leave_policy_id: 'lp-002',
  start_date: '2026-09-01T00:00:00.000Z',
  end_date: '2026-09-03T00:00:00.000Z',
  reason: 'Personal errand',
  status: 'REJECTED',
  approved_by: 'emp-002',
  approved_at: '2026-08-15T00:00:00.000Z',
  created_at: '2026-08-10T00:00:00.000Z',
  updated_at: '2026-08-15T00:00:00.000Z',
};

function expectLeaveRequestMatchesRow(
  leaveRequest: LeaveRequest,
  row: Record<string, unknown>,
): void {
  expect(leaveRequest.id).toBe(row.id);
  expect(leaveRequest.employeeId).toBe(row.employee_id);
  expect(leaveRequest.leavePolicyId).toBe(row.leave_policy_id);
  expect(leaveRequest.startDate).toEqual(new Date(row.start_date as string));
  expect(leaveRequest.endDate).toEqual(new Date(row.end_date as string));
  expect(leaveRequest.reason).toBe((row.reason as string | null) ?? undefined);
  expect(leaveRequest.status).toBe(row.status);
  expect(leaveRequest.approvedBy).toBe((row.approved_by as string) ?? null);
  expect(leaveRequest.approvedAt).toEqual(
    row.approved_at ? new Date(row.approved_at as string) : null,
  );
  expect(leaveRequest.createdAt).toEqual(new Date(row.created_at as string));
  expect(leaveRequest.updatedAt).toEqual(new Date(row.updated_at as string));
}

describe('LeaveRequestRepository', () => {
  let repository: LeaveRequestRepository;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    const mockPool = new Pool() as jest.Mocked<Pool>;
    mockQuery = mockPool.query as unknown as jest.Mock;
    repository = new LeaveRequestRepository(mockPool);
  });

  describe('findById', () => {
    it('should return a LeaveRequest when a row matches the given id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockLeaveRequestRow] });

      const result = await repository.findById('lr-001');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE id = $1',
        ['lr-001'],
      );
      expect(result).not.toBeNull();
      expectLeaveRequestMatchesRow(result!, mockLeaveRequestRow);
    });

    it('should return null when no row matches the given id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should use parameterized query to prevent SQL injection', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await repository.findById("1' OR '1'='1");

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE id = $1',
        ["1' OR '1'='1"],
      );
    });

    it('should throw when the pool query fails', async () => {
      mockQuery.mockRejectedValueOnce(new Error('connection refused'));

      await expect(repository.findById('lr-001')).rejects.toThrow(
        'Failed to find leave request by id: connection refused',
      );
    });
  });

  describe('findByEmployee', () => {
    it('should return LeaveRequests when rows match the given employeeId', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [mockLeaveRequestRow, mockApprovedLeaveRequestRow],
      });

      const result = await repository.findByEmployee('emp-001');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE employee_id = $1',
        ['emp-001'],
      );
      expect(result).toHaveLength(2);
      expectLeaveRequestMatchesRow(result[0], mockLeaveRequestRow);
      expectLeaveRequestMatchesRow(result[1], mockApprovedLeaveRequestRow);
    });

    it('should return an empty array when no rows match', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findByEmployee('nonexistent');

      expect(result).toEqual([]);
    });

    it('should use parameterized query to prevent SQL injection', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await repository.findByEmployee("1' OR '1'='1");

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE employee_id = $1',
        ["1' OR '1'='1"],
      );
    });

    it('should throw when the pool query fails', async () => {
      mockQuery.mockRejectedValueOnce(new Error('connection refused'));

      await expect(repository.findByEmployee('emp-001')).rejects.toThrow(
        'Failed to find leave requests by employee: connection refused',
      );
    });
  });

  describe('findByStatus', () => {
    it('should return LeaveRequests when rows match the given status', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [mockLeaveRequestRow],
      });

      const result = await repository.findByStatus(LeaveRequestStatus.DRAFT);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE status = $1',
        [LeaveRequestStatus.DRAFT],
      );
      expect(result).toHaveLength(1);
      expectLeaveRequestMatchesRow(result[0], mockLeaveRequestRow);
    });

    it('should return an empty array when no rows match the given status', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findByStatus(LeaveRequestStatus.CANCELLED);

      expect(result).toEqual([]);
    });

    it('should use parameterized query to prevent SQL injection', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await repository.findByStatus(LeaveRequestStatus.APPROVED);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE status = $1',
        [LeaveRequestStatus.APPROVED],
      );
    });

    it('should throw when the pool query fails', async () => {
      mockQuery.mockRejectedValueOnce(new Error('connection refused'));

      await expect(repository.findByStatus(LeaveRequestStatus.SUBMITTED)).rejects.toThrow(
        'Failed to find leave requests by status: connection refused',
      );
    });
  });

  describe('create', () => {
    const createDto: CreateLeaveRequestDto = {
      employeeId: 'emp-001',
      leavePolicyId: 'lp-001',
      startDate: new Date('2026-07-01T00:00:00.000Z'),
      endDate: new Date('2026-07-05T00:00:00.000Z'),
      reason: 'Family vacation',
    };

    it('should persist a new leave_requests row with DRAFT status and return the created LeaveRequest', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockLeaveRequestRow] });

      const result = await repository.create(createDto);

      expect(mockQuery).toHaveBeenCalledWith(
        `INSERT INTO leave_requests (employee_id, leave_policy_id, start_date, end_date, reason, status, approved_by, approved_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          'emp-001',
          'lp-001',
          createDto.startDate,
          createDto.endDate,
          'Family vacation',
          LeaveRequestStatus.DRAFT,
          null,
          null,
        ],
      );
      expect(result).not.toBeNull();
      expect(result.status).toBe(LeaveRequestStatus.DRAFT);
      expect(result.approvedBy).toBeNull();
      expect(result.approvedAt).toBeNull();
      expectLeaveRequestMatchesRow(result, mockLeaveRequestRow);
    });

    it('should map undefined reason to SQL NULL on create', async () => {
      const dtoWithoutReason: CreateLeaveRequestDto = {
        employeeId: 'emp-001',
        leavePolicyId: 'lp-001',
        startDate: new Date('2026-08-10T00:00:00.000Z'),
        endDate: new Date('2026-08-12T00:00:00.000Z'),
      };
      mockQuery.mockResolvedValueOnce({ rows: [mockApprovedLeaveRequestRow] });

      await repository.create(dtoWithoutReason);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [
          'emp-001',
          'lp-001',
          dtoWithoutReason.startDate,
          dtoWithoutReason.endDate,
          null,
          LeaveRequestStatus.DRAFT,
          null,
          null,
        ],
      );
    });

    it('should always create with DRAFT status regardless of any external input', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockLeaveRequestRow] });

      await repository.create(createDto);

      const callArgs = mockQuery.mock.calls[0];
      expect(callArgs[1][5]).toBe(LeaveRequestStatus.DRAFT);
    });

    it('should throw when the pool query fails (including FK constraint violation)', async () => {
      mockQuery.mockRejectedValueOnce(
        new Error('insert or update on table "leave_requests" violates foreign key constraint'),
      );

      await expect(repository.create(createDto)).rejects.toThrow(
        'Failed to create leave request: insert or update on table "leave_requests" violates foreign key constraint',
      );
    });
  });

  describe('updateStatus', () => {
    it('should update status and return the updated LeaveRequest', async () => {
      const updatedRow: Record<string, unknown> = {
        ...mockLeaveRequestRow,
        status: 'SUBMITTED',
      };
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await repository.updateStatus('lr-001', LeaveRequestStatus.SUBMITTED);

      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE leave_requests SET status = $1, approved_by = $2, approved_at = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
        [LeaveRequestStatus.SUBMITTED, null, null, 'lr-001'],
      );
      expect(result).not.toBeNull();
      expect(result.status).toBe(LeaveRequestStatus.SUBMITTED);
    });

    it('should set approvedBy and approvedAt when provided', async () => {
      const approvedAt = new Date('2026-07-20T00:00:00.000Z');
      const updatedRow: Record<string, unknown> = {
        ...mockLeaveRequestRow,
        status: 'APPROVED',
        approved_by: 'emp-002',
        approved_at: '2026-07-20T00:00:00.000Z',
      };
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await repository.updateStatus(
        'lr-001',
        LeaveRequestStatus.APPROVED,
        'emp-002',
        approvedAt,
      );

      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE leave_requests SET status = $1, approved_by = $2, approved_at = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
        [LeaveRequestStatus.APPROVED, 'emp-002', approvedAt, 'lr-001'],
      );
      expect(result.approvedBy).toBe('emp-002');
      expect(result.approvedAt).toEqual(approvedAt);
    });

    it('should default approvedBy and approvedAt to null when omitted', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockRejectedLeaveRequestRow] });

      await repository.updateStatus('lr-003', LeaveRequestStatus.REJECTED);

      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE leave_requests SET status = $1, approved_by = $2, approved_at = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
        [LeaveRequestStatus.REJECTED, null, null, 'lr-003'],
      );
    });

    it('should use parameterized query to prevent SQL injection', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockLeaveRequestRow] });

      await repository.updateStatus("1' OR '1'='1", LeaveRequestStatus.CANCELLED);

      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE leave_requests SET status = $1, approved_by = $2, approved_at = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
        [LeaveRequestStatus.CANCELLED, null, null, "1' OR '1'='1"],
      );
    });

    it('should throw when the pool query fails', async () => {
      mockQuery.mockRejectedValueOnce(new Error('connection refused'));

      await expect(
        repository.updateStatus('lr-001', LeaveRequestStatus.APPROVED),
      ).rejects.toThrow(
        'Failed to update leave request status: connection refused',
      );
    });
  });

  describe('reason field handling', () => {
    it('should map database NULL reason to undefined on read', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockApprovedLeaveRequestRow] });

      const result = await repository.findById('lr-002');

      expect(result).not.toBeNull();
      expect(result!.reason).toBeUndefined();
    });

    it('should preserve string reason value on read', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockLeaveRequestRow] });

      const result = await repository.findById('lr-001');

      expect(result).not.toBeNull();
      expect(result!.reason).toBe('Family vacation');
    });
  });

  describe('nullable approvedBy and approvedAt fields', () => {
    it('should return null for approvedBy and approvedAt when row has null values', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockLeaveRequestRow] });

      const result = await repository.findById('lr-001');

      expect(result).not.toBeNull();
      expect(result!.approvedBy).toBeNull();
      expect(result!.approvedAt).toBeNull();
    });

    it('should return string and Date for approvedBy and approvedAt when row has values', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockApprovedLeaveRequestRow] });

      const result = await repository.findById('lr-002');

      expect(result).not.toBeNull();
      expect(result!.approvedBy).toBe('emp-002');
      expect(result!.approvedAt).toEqual(new Date('2026-07-20T00:00:00.000Z'));
    });
  });

  describe('status enum values', () => {
    it.each([
      ['DRAFT', LeaveRequestStatus.DRAFT],
      ['SUBMITTED', LeaveRequestStatus.SUBMITTED],
      ['APPROVED', LeaveRequestStatus.APPROVED],
      ['REJECTED', LeaveRequestStatus.REJECTED],
      ['CANCELLED', LeaveRequestStatus.CANCELLED],
    ])('should map status "%s" to LeaveRequestStatus.%s', async (dbStatus, expectedEnum) => {
      const row: Record<string, unknown> = {
        ...mockLeaveRequestRow,
        status: dbStatus,
      };
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repository.findById('lr-001');

      expect(result).not.toBeNull();
      expect(result!.status).toBe(expectedEnum);
    });
  });
});
