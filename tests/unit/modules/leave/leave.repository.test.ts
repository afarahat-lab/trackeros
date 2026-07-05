
import { LeaveRepository } from '../../../../src/modules/leave/leave.repository';
import { pool } from '../../../../src/shared/db/connection';
import { LeaveStatus } from '../../../../src/shared/types/leave.types';
import {
  LeaveRequest,
  CreateLeaveRequestDto,
  UpdateLeaveRequestDto,
  LeaveRequestQueryParams,
} from '../../../../src/modules/leave/leave.model';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mockedPool = pool as jest.Mocked<typeof pool>;

function makeRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: 'lr-001',
    employee_id: 'emp-001',
    leave_type_id: 'lt-001',
    start_date: new Date('2026-07-10'),
    end_date: new Date('2026-07-15'),
    reason: 'Vacation',
    status: LeaveStatus.PENDING,
    approved_by: null,
    approved_at: null,
    rejected_by: null,
    rejected_at: null,
    rejection_reason: null,
    cancelled_by: null,
    cancelled_at: null,
    cancellation_reason: null,
    created_at: new Date('2026-07-01T10:00:00Z'),
    updated_at: new Date('2026-07-01T10:00:00Z'),
    ...overrides,
  };
}

function makeLeaveRequest(overrides: Partial<LeaveRequest> = {}): LeaveRequest {
  return {
    id: 'lr-001',
    employeeId: 'emp-001',
    leaveTypeId: 'lt-001',
    startDate: new Date('2026-07-10'),
    endDate: new Date('2026-07-15'),
    reason: 'Vacation',
    status: LeaveStatus.PENDING,
    approvedBy: null,
    approvedAt: null,
    rejectedBy: null,
    rejectedAt: null,
    rejectionReason: null,
    cancelledBy: null,
    cancelledAt: null,
    cancellationReason: null,
    createdAt: new Date('2026-07-01T10:00:00Z'),
    updatedAt: new Date('2026-07-01T10:00:00Z'),
    ...overrides,
  };
}

describe('LeaveRepository', () => {
  let repo: LeaveRepository;

  beforeEach(() => {
    repo = new LeaveRepository();
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return a LeaveRequest when found', async () => {
      const row = makeRow();
      mockedPool.query.mockResolvedValueOnce({ rows: [row] } as never);

      const result = await repo.findById('lr-001');

      expect(result).toEqual(makeLeaveRequest());
      expect(mockedPool.query).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE id = $1',
        ['lr-001'],
      );
    });

    it('should return null when not found', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [] } as never);

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmployeeId', () => {
    it('should return leave requests for an employee', async () => {
      const row1 = makeRow();
      const row2 = makeRow({ id: 'lr-002', reason: 'Sick leave' });
      mockedPool.query.mockResolvedValueOnce({ rows: [row1, row2] } as never);

      const result = await repo.findByEmployeeId('emp-001');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('lr-001');
      expect(result[1].id).toBe('lr-002');
      expect(mockedPool.query).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE employee_id = $1 ORDER BY created_at DESC',
        ['emp-001'],
      );
    });

    it('should return empty array when no requests found', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [] } as never);

      const result = await repo.findByEmployeeId('emp-999');

      expect(result).toEqual([]);
    });
  });

  describe('findByStatus', () => {
    it('should return leave requests filtered by status', async () => {
      const row = makeRow({ status: LeaveStatus.APPROVED });
      mockedPool.query.mockResolvedValueOnce({ rows: [row] } as never);

      const result = await repo.findByStatus(LeaveStatus.APPROVED);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(LeaveStatus.APPROVED);
      expect(mockedPool.query).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE status = $1 ORDER BY created_at DESC',
        [LeaveStatus.APPROVED],
      );
    });
  });

  describe('findByQueryParams', () => {
    it('should filter by employeeId', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [makeRow()] } as never);

      const params: LeaveRequestQueryParams = { employeeId: 'emp-001' };
      await repo.findByQueryParams(params);

      expect(mockedPool.query).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE employee_id = $1 ORDER BY created_at DESC',
        ['emp-001'],
      );
    });

    it('should filter by status', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [] } as never);

      const params: LeaveRequestQueryParams = { status: LeaveStatus.REJECTED };
      await repo.findByQueryParams(params);

      expect(mockedPool.query).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE status = $1 ORDER BY created_at DESC',
        [LeaveStatus.REJECTED],
      );
    });

    it('should filter by date range', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [] } as never);

      const startDate = new Date('2026-07-01');
      const endDate = new Date('2026-07-31');
      const params: LeaveRequestQueryParams = { startDate, endDate };
      await repo.findByQueryParams(params);

      expect(mockedPool.query).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE start_date >= $1 AND end_date <= $2 ORDER BY created_at DESC',
        [startDate, endDate],
      );
    });

    it('should combine multiple filters', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [] } as never);

      const params: LeaveRequestQueryParams = {
        employeeId: 'emp-001',
        status: LeaveStatus.PENDING,
      };
      await repo.findByQueryParams(params);

      expect(mockedPool.query).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE employee_id = $1 AND status = $2 ORDER BY created_at DESC',
        ['emp-001', LeaveStatus.PENDING],
      );
    });

    it('should return all when no filters provided', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [makeRow()] } as never);

      const result = await repo.findByQueryParams({});

      expect(result).toHaveLength(1);
      expect(mockedPool.query).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests  ORDER BY created_at DESC',
        [],
      );
    });
  });

  describe('create', () => {
    it('should insert a new leave request with PENDING status', async () => {
      const dto: CreateLeaveRequestDto = {
        employeeId: 'emp-001',
        leaveTypeId: 'lt-001',
        startDate: new Date('2026-07-10'),
        endDate: new Date('2026-07-15'),
        reason: 'Vacation',
      };
      const row = makeRow();
      mockedPool.query.mockResolvedValueOnce({ rows: [row] } as never);

      const result = await repo.create(dto);

      expect(result.status).toBe(LeaveStatus.PENDING);
      expect(mockedPool.query).toHaveBeenCalledWith(
        `INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, reason, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
        [dto.employeeId, dto.leaveTypeId, dto.startDate, dto.endDate, dto.reason, LeaveStatus.PENDING],
      );
    });

    it('should handle missing reason', async () => {
      const dto: CreateLeaveRequestDto = {
        employeeId: 'emp-002',
        leaveTypeId: 'lt-002',
        startDate: new Date('2026-08-01'),
        endDate: new Date('2026-08-05'),
      };
      const row = makeRow({ reason: null });
      mockedPool.query.mockResolvedValueOnce({ rows: [row] } as never);

      const result = await repo.create(dto);

      expect(result.reason).toBeNull();
      expect(mockedPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [dto.employeeId, dto.leaveTypeId, dto.startDate, dto.endDate, null, LeaveStatus.PENDING],
      );
    });
  });

  describe('update', () => {
    it('should update status fields', async () => {
      const dto: UpdateLeaveRequestDto = {
        status: LeaveStatus.APPROVED,
        approvedBy: 'mgr-001',
        approvedAt: new Date('2026-07-02T10:00:00Z'),
      };
      const row = makeRow({
        status: LeaveStatus.APPROVED,
        approved_by: 'mgr-001',
        approved_at: new Date('2026-07-02T10:00:00Z'),
      });
      mockedPool.query.mockResolvedValueOnce({ rows: [row] } as never);

      const result = await repo.update('lr-001', dto);

      expect(result).not.toBeNull();
      expect(result!.status).toBe(LeaveStatus.APPROVED);
      expect(result!.approvedBy).toBe('mgr-001');
    });

    it('should return null when no fields to update', async () => {
      const result = await repo.update('lr-001', {});

      expect(result).toBeNull();
      expect(mockedPool.query).not.toHaveBeenCalled();
    });

    it('should return null when record not found', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [] } as never);

      const result = await repo.update('nonexistent', { status: LeaveStatus.APPROVED });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should return true when a row is deleted', async () => {
      mockedPool.query.mockResolvedValueOnce({ rowCount: 1 } as never);

      const result = await repo.delete('lr-001');

      expect(result).toBe(true);
      expect(mockedPool.query).toHaveBeenCalledWith(
        'DELETE FROM leave_requests WHERE id = $1',
        ['lr-001'],
      );
    });

    it('should return false when no row is deleted', async () => {
      mockedPool.query.mockResolvedValueOnce({ rowCount: 0 } as never);

      const result = await repo.delete('nonexistent');

      expect(result).toBe(false);
    });
  });
});
