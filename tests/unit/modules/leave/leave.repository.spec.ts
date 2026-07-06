
import { Pool } from 'pg';
import { LeaveRepository } from '../../../../src/modules/leave/leave.repository';
import { LeaveRequest } from '../../../../src/modules/leave/leave.model';
import { LeaveStatus } from '../../../../src/shared/types/leave.types';

jest.mock('pg', () => {
  const mockQuery = jest.fn();
  return {
    Pool: jest.fn(() => ({
      query: mockQuery,
    })),
  };
});

const makeRequest = (overrides: Partial<LeaveRequest> = {}): LeaveRequest => ({
  id: 1,
  employeeId: 100,
  leaveTypeId: 10,
  startDate: new Date('2026-07-10'),
  endDate: new Date('2026-07-15'),
  reason: 'Family vacation',
  status: LeaveStatus.PENDING,
  approvedBy: null,
  approvedAt: null,
  rejectedBy: null,
  rejectedAt: null,
  rejectionReason: null,
  cancelledBy: null,
  cancelledAt: null,
  cancellationReason: null,
  createdAt: new Date('2026-07-01'),
  updatedAt: new Date('2026-07-01'),
  ...overrides,
});

describe('LeaveRepository', () => {
  let repo: LeaveRepository;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    const mockPool = new Pool() as jest.Mocked<Pool>;
    mockQuery = mockPool.query as unknown as jest.Mock;
    repo = new LeaveRepository(mockPool);
  });

  describe('findById', () => {
    it('should return a leave request when found', async () => {
      const request = makeRequest();
      mockQuery.mockResolvedValueOnce({ rows: [request] });

      const result = await repo.findById(1);
      expect(result).toEqual(request);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE id = $1',
        [1]
      );
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById(999);
      expect(result).toBeNull();
    });
  });

  describe('findByEmployeeId', () => {
    it('should return requests for an employee ordered by created_at DESC', async () => {
      const requests = [makeRequest(), makeRequest({ id: 2, leaveTypeId: 11 })];
      mockQuery.mockResolvedValueOnce({ rows: requests });

      const result = await repo.findByEmployeeId(100);
      expect(result).toEqual(requests);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE employee_id = $1 ORDER BY created_at DESC',
        [100]
      );
    });

    it('should return empty array when no requests found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployeeId(999);
      expect(result).toEqual([]);
    });
  });

  describe('findByStatus', () => {
    it('should return requests with the given status', async () => {
      const requests = [makeRequest(), makeRequest({ id: 2 })];
      mockQuery.mockResolvedValueOnce({ rows: requests });

      const result = await repo.findByStatus(LeaveStatus.PENDING);
      expect(result).toEqual(requests);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE status = $1 ORDER BY created_at DESC',
        [LeaveStatus.PENDING]
      );
    });

    it('should return empty array when no requests match', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByStatus(LeaveStatus.APPROVED);
      expect(result).toEqual([]);
    });
  });

  describe('findByDateRange', () => {
    it('should return requests overlapping the date range', async () => {
      const requests = [makeRequest()];
      mockQuery.mockResolvedValueOnce({ rows: requests });

      const startDate = new Date('2026-07-01');
      const endDate = new Date('2026-07-31');
      const result = await repo.findByDateRange(startDate, endDate);
      expect(result).toEqual(requests);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE start_date <= $2 AND end_date >= $1'),
        [startDate, endDate]
      );
    });

    it('should return empty array when no requests overlap', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByDateRange(
        new Date('2025-01-01'),
        new Date('2025-01-31')
      );
      expect(result).toEqual([]);
    });
  });

  describe('findPendingForManager', () => {
    it('should return pending requests for employees under a manager', async () => {
      const requests = [makeRequest(), makeRequest({ id: 2, employeeId: 101 })];
      mockQuery.mockResolvedValueOnce({ rows: requests });

      const result = await repo.findPendingForManager(200);
      expect(result).toEqual(requests);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INNER JOIN employees e ON lr.employee_id = e.id'),
        [200, LeaveStatus.PENDING]
      );
    });

    it('should return empty array when no pending requests', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findPendingForManager(200);
      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should insert and return a new leave request with PENDING status', async () => {
      const input = {
        employeeId: 100,
        leaveTypeId: 10,
        startDate: new Date('2026-07-10'),
        endDate: new Date('2026-07-15'),
        reason: 'Family vacation',
      };
      const created = makeRequest(input);
      mockQuery.mockResolvedValueOnce({ rows: [created] });

      const result = await repo.create(input);
      expect(result).toEqual(created);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_requests'),
        [100, 10, input.startDate, input.endDate, 'Family vacation', LeaveStatus.PENDING]
      );
    });
  });

  describe('update', () => {
    it('should update and return the leave request', async () => {
      const updated = makeRequest({ reason: 'Updated reason' });
      mockQuery.mockResolvedValueOnce({ rows: [updated] });

      const result = await repo.update(1, { reason: 'Updated reason' });
      expect(result).toEqual(updated);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_requests SET'),
        ['Updated reason', 1]
      );
    });

    it('should return null when no fields to update', async () => {
      const result = await repo.update(1, {});
      expect(result).toBeNull();
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should return null when request not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.update(999, { reason: 'Test' });
      expect(result).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('should approve a request and set approved_by and approved_at', async () => {
      const approved = makeRequest({
        status: LeaveStatus.APPROVED,
        approvedBy: 200,
        approvedAt: new Date('2026-07-02'),
      });
      mockQuery.mockResolvedValueOnce({ rows: [approved] });

      const result = await repo.updateStatus(1, LeaveStatus.APPROVED, 200);
      expect(result).toEqual(approved);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SET status = $2, approved_by = $3, approved_at = $4'),
        [1, LeaveStatus.APPROVED, 200, expect.any(Date)]
      );
    });

    it('should reject a request with rejection reason', async () => {
      const rejected = makeRequest({
        status: LeaveStatus.REJECTED,
        rejectedBy: 200,
        rejectedAt: new Date('2026-07-02'),
        rejectionReason: 'Insufficient coverage',
      });
      mockQuery.mockResolvedValueOnce({ rows: [rejected] });

      const result = await repo.updateStatus(1, LeaveStatus.REJECTED, 200, 'Insufficient coverage');
      expect(result).toEqual(rejected);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SET status = $2, rejected_by = $3, rejected_at = $4, rejection_reason = $5'),
        [1, LeaveStatus.REJECTED, 200, expect.any(Date), 'Insufficient coverage']
      );
    });

    it('should cancel a request with cancellation reason', async () => {
      const cancelled = makeRequest({
        status: LeaveStatus.CANCELLED,
        cancelledBy: 100,
        cancelledAt: new Date('2026-07-03'),
        cancellationReason: 'No longer needed',
      });
      mockQuery.mockResolvedValueOnce({ rows: [cancelled] });

      const result = await repo.updateStatus(1, LeaveStatus.CANCELLED, 100, 'No longer needed');
      expect(result).toEqual(cancelled);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SET status = $2, cancelled_by = $3, cancelled_at = $4, cancellation_reason = $5'),
        [1, LeaveStatus.CANCELLED, 100, expect.any(Date), 'No longer needed']
      );
    });

    it('should handle status update to PENDING (default case)', async () => {
      const pending = makeRequest({ status: LeaveStatus.PENDING });
      mockQuery.mockResolvedValueOnce({ rows: [pending] });

      const result = await repo.updateStatus(1, LeaveStatus.PENDING, 200);
      expect(result).toEqual(pending);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SET status = $2, updated_at = NOW()'),
        [1, LeaveStatus.PENDING]
      );
    });

    it('should return null when request not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.updateStatus(999, LeaveStatus.APPROVED, 200);
      expect(result).toBeNull();
    });
  });
});
