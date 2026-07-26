
import { Pool } from 'pg';
import { LeaveRepository } from '../../../../src/modules/leave/leave.repository';
import type {
  LeaveRequest,
  LeaveBalance,
  CreateLeaveRequestDto,
  UpdateLeaveRequestStatusDto,
} from '../../../../src/modules/leave/leave.model';

jest.mock('pg', () => {
  const mockPool = {
    query: jest.fn(),
  };
  return { Pool: jest.fn(() => mockPool) };
});

describe('LeaveRepository', () => {
  let repository: LeaveRepository;
  let mockPool: jest.Mocked<Pick<Pool, 'query'>>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool = new Pool() as unknown as jest.Mocked<Pick<Pool, 'query'>>;
    repository = new LeaveRepository(mockPool as unknown as Pool);
  });

  describe('findById', () => {
    it('should return a leave request when found', async () => {
      const mockRequest: LeaveRequest = {
        id: 'req-1',
        employeeId: 'emp-1',
        leaveTypeId: 'lt-1',
        startDate: new Date('2026-08-01'),
        endDate: new Date('2026-08-05'),
        reason: 'Vacation',
        status: 'DRAFT',
        approvedBy: null,
        approvedAt: null,
        rejectedBy: null,
        rejectedAt: null,
        rejectionReason: null,
        cancelledBy: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockRequest] });

      const result = await repository.findById('req-1');

      expect(result).toEqual(mockRequest);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE id = $1',
        ['req-1'],
      );
    });

    it('should return null when not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmployeeId', () => {
    it('should return all leave requests for an employee ordered by created_at DESC', async () => {
      const mockRequests: LeaveRequest[] = [
        {
          id: 'req-2',
          employeeId: 'emp-1',
          leaveTypeId: 'lt-1',
          startDate: new Date('2026-09-01'),
          endDate: new Date('2026-09-03'),
          reason: undefined,
          status: 'SUBMITTED',
          approvedBy: null,
          approvedAt: null,
          rejectedBy: null,
          rejectedAt: null,
          rejectionReason: null,
          cancelledBy: null,
          cancelledAt: null,
          createdAt: new Date('2026-07-20'),
          updatedAt: new Date('2026-07-20'),
        },
        {
          id: 'req-1',
          employeeId: 'emp-1',
          leaveTypeId: 'lt-1',
          startDate: new Date('2026-08-01'),
          endDate: new Date('2026-08-05'),
          reason: 'Vacation',
          status: 'DRAFT',
          approvedBy: null,
          approvedAt: null,
          rejectedBy: null,
          rejectedAt: null,
          rejectionReason: null,
          cancelledBy: null,
          cancelledAt: null,
          createdAt: new Date('2026-07-15'),
          updatedAt: new Date('2026-07-15'),
        },
      ];

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: mockRequests });

      const result = await repository.findByEmployeeId('emp-1');

      expect(result).toEqual(mockRequests);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE employee_id = $1 ORDER BY created_at DESC',
        ['emp-1'],
      );
    });

    it('should return empty array when employee has no requests', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await repository.findByEmployeeId('emp-none');

      expect(result).toEqual([]);
    });
  });

  describe('findByStatus', () => {
    it('should return all leave requests with the given status', async () => {
      const mockRequests: LeaveRequest[] = [
        {
          id: 'req-1',
          employeeId: 'emp-1',
          leaveTypeId: 'lt-1',
          startDate: new Date('2026-08-01'),
          endDate: new Date('2026-08-05'),
          reason: 'Vacation',
          status: 'SUBMITTED',
          approvedBy: null,
          approvedAt: null,
          rejectedBy: null,
          rejectedAt: null,
          rejectionReason: null,
          cancelledBy: null,
          cancelledAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: mockRequests });

      const result = await repository.findByStatus('SUBMITTED');

      expect(result).toEqual(mockRequests);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE status = $1',
        ['SUBMITTED'],
      );
    });

    it('should return empty array when no requests match status', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await repository.findByStatus('APPROVED');

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should insert a new leave request with DRAFT status and return it', async () => {
      const dto: CreateLeaveRequestDto = {
        employeeId: 'emp-1',
        leaveTypeId: 'lt-1',
        startDate: new Date('2026-08-01'),
        endDate: new Date('2026-08-05'),
        reason: 'Vacation',
      };

      const mockCreated: LeaveRequest = {
        id: 'req-new',
        employeeId: 'emp-1',
        leaveTypeId: 'lt-1',
        startDate: new Date('2026-08-01'),
        endDate: new Date('2026-08-05'),
        reason: 'Vacation',
        status: 'DRAFT',
        approvedBy: null,
        approvedAt: null,
        rejectedBy: null,
        rejectedAt: null,
        rejectionReason: null,
        cancelledBy: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockCreated] });

      const result = await repository.create(dto);

      expect(result).toEqual(mockCreated);
      expect(result.status).toBe('DRAFT');
      expect(mockPool.query).toHaveBeenCalledWith(
        `INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, reason, status)
       VALUES ($1, $2, $3, $4, $5, 'DRAFT')
       RETURNING *`,
        ['emp-1', 'lt-1', dto.startDate, dto.endDate, 'Vacation'],
      );
    });

    it('should handle undefined reason', async () => {
      const dto: CreateLeaveRequestDto = {
        employeeId: 'emp-1',
        leaveTypeId: 'lt-1',
        startDate: new Date('2026-08-01'),
        endDate: new Date('2026-08-05'),
        reason: undefined,
      };

      const mockCreated: LeaveRequest = {
        id: 'req-new',
        employeeId: 'emp-1',
        leaveTypeId: 'lt-1',
        startDate: new Date('2026-08-01'),
        endDate: new Date('2026-08-05'),
        reason: undefined,
        status: 'DRAFT',
        approvedBy: null,
        approvedAt: null,
        rejectedBy: null,
        rejectedAt: null,
        rejectionReason: null,
        cancelledBy: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockCreated] });

      const result = await repository.create(dto);

      expect(result).toEqual(mockCreated);
      expect(mockPool.query).toHaveBeenCalledWith(
        `INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, reason, status)
       VALUES ($1, $2, $3, $4, $5, 'DRAFT')
       RETURNING *`,
        ['emp-1', 'lt-1', dto.startDate, dto.endDate, null],
      );
    });
  });

  describe('updateStatus', () => {
    const now = new Date();

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(now);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should set approved_by and approved_at when status is APPROVED', async () => {
      const dto: UpdateLeaveRequestStatusDto = {
        status: 'APPROVED',
        reviewerId: 'mgr-1',
        rejectionReason: undefined,
      };

      const mockUpdated: LeaveRequest = {
        id: 'req-1',
        employeeId: 'emp-1',
        leaveTypeId: 'lt-1',
        startDate: new Date('2026-08-01'),
        endDate: new Date('2026-08-05'),
        reason: 'Vacation',
        status: 'APPROVED',
        approvedBy: 'mgr-1',
        approvedAt: now,
        rejectedBy: null,
        rejectedAt: null,
        rejectionReason: null,
        cancelledBy: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: now,
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUpdated] });

      const result = await repository.updateStatus('req-1', dto);

      expect(result).toEqual(mockUpdated);
      expect(mockPool.query).toHaveBeenCalledWith(
        `UPDATE leave_requests
           SET status = $1, approved_by = $2, approved_at = $3, updated_at = $3
           WHERE id = $4
           RETURNING *`,
        ['APPROVED', 'mgr-1', now, 'req-1'],
      );
    });

    it('should set rejected_by, rejected_at, and rejection_reason when status is REJECTED', async () => {
      const dto: UpdateLeaveRequestStatusDto = {
        status: 'REJECTED',
        reviewerId: 'mgr-1',
        rejectionReason: 'Insufficient staffing',
      };

      const mockUpdated: LeaveRequest = {
        id: 'req-1',
        employeeId: 'emp-1',
        leaveTypeId: 'lt-1',
        startDate: new Date('2026-08-01'),
        endDate: new Date('2026-08-05'),
        reason: 'Vacation',
        status: 'REJECTED',
        approvedBy: null,
        approvedAt: null,
        rejectedBy: 'mgr-1',
        rejectedAt: now,
        rejectionReason: 'Insufficient staffing',
        cancelledBy: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: now,
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUpdated] });

      const result = await repository.updateStatus('req-1', dto);

      expect(result).toEqual(mockUpdated);
      expect(mockPool.query).toHaveBeenCalledWith(
        `UPDATE leave_requests
           SET status = $1, rejected_by = $2, rejected_at = $3, rejection_reason = $4, updated_at = $3
           WHERE id = $5
           RETURNING *`,
        ['REJECTED', 'mgr-1', now, 'Insufficient staffing', 'req-1'],
      );
    });

    it('should set cancelled_by and cancelled_at when status is CANCELLED', async () => {
      const dto: UpdateLeaveRequestStatusDto = {
        status: 'CANCELLED',
        reviewerId: 'emp-1',
        rejectionReason: undefined,
      };

      const mockUpdated: LeaveRequest = {
        id: 'req-1',
        employeeId: 'emp-1',
        leaveTypeId: 'lt-1',
        startDate: new Date('2026-08-01'),
        endDate: new Date('2026-08-05'),
        reason: 'Vacation',
        status: 'CANCELLED',
        approvedBy: null,
        approvedAt: null,
        rejectedBy: null,
        rejectedAt: null,
        rejectionReason: null,
        cancelledBy: 'emp-1',
        cancelledAt: now,
        createdAt: new Date(),
        updatedAt: now,
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUpdated] });

      const result = await repository.updateStatus('req-1', dto);

      expect(result).toEqual(mockUpdated);
      expect(mockPool.query).toHaveBeenCalledWith(
        `UPDATE leave_requests
           SET status = $1, cancelled_by = $2, cancelled_at = $3, updated_at = $3
           WHERE id = $4
           RETURNING *`,
        ['CANCELLED', 'emp-1', now, 'req-1'],
      );
    });

    it('should handle SUBMITTED status (default case)', async () => {
      const dto: UpdateLeaveRequestStatusDto = {
        status: 'SUBMITTED',
        reviewerId: 'emp-1',
        rejectionReason: undefined,
      };

      const mockUpdated: LeaveRequest = {
        id: 'req-1',
        employeeId: 'emp-1',
        leaveTypeId: 'lt-1',
        startDate: new Date('2026-08-01'),
        endDate: new Date('2026-08-05'),
        reason: 'Vacation',
        status: 'SUBMITTED',
        approvedBy: null,
        approvedAt: null,
        rejectedBy: null,
        rejectedAt: null,
        rejectionReason: null,
        cancelledBy: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: now,
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUpdated] });

      const result = await repository.updateStatus('req-1', dto);

      expect(result).toEqual(mockUpdated);
      expect(mockPool.query).toHaveBeenCalledWith(
        `UPDATE leave_requests
           SET status = $1, updated_at = $2
           WHERE id = $3
           RETURNING *`,
        ['SUBMITTED', now, 'req-1'],
      );
    });

    it('should return null when request not found', async () => {
      const dto: UpdateLeaveRequestStatusDto = {
        status: 'APPROVED',
        reviewerId: 'mgr-1',
        rejectionReason: undefined,
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await repository.updateStatus('nonexistent', dto);

      expect(result).toBeNull();
    });
  });

  describe('getBalance', () => {
    it('should return a leave balance when found', async () => {
      const mockBalance: LeaveBalance = {
        id: 'bal-1',
        employeeId: 'emp-1',
        leaveTypeId: 'lt-1',
        entitlementDays: 20,
        usedDays: 5,
        accruedDays: 10,
        year: 2026,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockBalance] });

      const result = await repository.getBalance('emp-1', 'lt-1', 2026);

      expect(result).toEqual(mockBalance);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM leave_balances WHERE employee_id = $1 AND leave_type_id = $2 AND year = $3',
        ['emp-1', 'lt-1', 2026],
      );
    });

    it('should return null when balance not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await repository.getBalance('emp-1', 'lt-1', 2026);

      expect(result).toBeNull();
    });
  });

  describe('upsertBalance', () => {
    it('should insert or update a balance and return it', async () => {
      const balanceInput: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'> = {
        employeeId: 'emp-1',
        leaveTypeId: 'lt-1',
        entitlementDays: 20,
        usedDays: 5,
        accruedDays: 10,
        year: 2026,
      };

      const mockBalance: LeaveBalance = {
        id: 'bal-1',
        employeeId: 'emp-1',
        leaveTypeId: 'lt-1',
        entitlementDays: 20,
        usedDays: 5,
        accruedDays: 10,
        year: 2026,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockBalance] });

      const result = await repository.upsertBalance(balanceInput);

      expect(result).toEqual(mockBalance);
      expect(mockPool.query).toHaveBeenCalledWith(
        `INSERT INTO leave_balances (employee_id, leave_type_id, entitlement_days, used_days, accrued_days, year)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (employee_id, leave_type_id, year)
       DO UPDATE SET entitlement_days = EXCLUDED.entitlement_days,
                     used_days = EXCLUDED.used_days,
                     accrued_days = EXCLUDED.accrued_days,
                     updated_at = NOW()
       RETURNING *`,
        ['emp-1', 'lt-1', 20, 5, 10, 2026],
      );
    });
  });

  describe('decrementBalance', () => {
    it('should decrement used_days and return updated balance', async () => {
      const mockBalance: LeaveBalance = {
        id: 'bal-1',
        employeeId: 'emp-1',
        leaveTypeId: 'lt-1',
        entitlementDays: 20,
        usedDays: 8,
        accruedDays: 10,
        year: 2026,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockBalance] });

      const result = await repository.decrementBalance('emp-1', 'lt-1', 2026, 3);

      expect(result).toEqual(mockBalance);
      expect(mockPool.query).toHaveBeenCalledWith(
        `UPDATE leave_balances
       SET used_days = used_days + $1, updated_at = NOW()
       WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4
       RETURNING *`,
        [3, 'emp-1', 'lt-1', 2026],
      );
    });

    it('should return null when balance not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await repository.decrementBalance('emp-1', 'lt-1', 2026, 3);

      expect(result).toBeNull();
    });
  });
});
