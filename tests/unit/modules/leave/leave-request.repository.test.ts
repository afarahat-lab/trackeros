import { LeaveRequestRepository } from '../../../../src/modules/leave/leave-request.repository';
import { pool } from '../../../../src/shared/db/connection';
import { LeaveRequest, CreateLeaveRequestDto } from '../../../../src/modules/leave/leave-request.model';
import { LeaveStatus } from '../../../../src/shared/types';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mockQuery = pool.query as jest.Mock;

function makeLeaveRequest(overrides: Partial<LeaveRequest> = {}): LeaveRequest {
  return {
    id: 'lr-1',
    employeeId: 'emp-1',
    leaveTypeId: 'lt-1',
    startDate: new Date('2025-06-01T00:00:00Z'),
    endDate: new Date('2025-06-05T00:00:00Z'),
    totalDays: 5,
    reason: 'Family vacation',
    status: LeaveStatus.PENDING,
    managerId: 'mgr-1',
    approvedBy: null,
    approvedAt: null,
    rejectionReason: null,
    cancelledAt: null,
    createdAt: new Date('2025-05-20T00:00:00Z'),
    updatedAt: new Date('2025-05-20T00:00:00Z'),
    ...overrides,
  };
}

function makeCreateDto(overrides: Partial<CreateLeaveRequestDto> = {}): CreateLeaveRequestDto {
  return {
    employeeId: 'emp-1',
    leaveTypeId: 'lt-1',
    startDate: new Date('2025-06-01T00:00:00Z'),
    endDate: new Date('2025-06-05T00:00:00Z'),
    totalDays: 5,
    reason: 'Family vacation',
    managerId: 'mgr-1',
    ...overrides,
  };
}

describe('LeaveRequestRepository', () => {
  let repo: LeaveRequestRepository;

  beforeEach(() => {
    repo = new LeaveRequestRepository();
    mockQuery.mockReset();
  });

  describe('findByEmployeeId', () => {
    it('should return leave requests for an employee ordered by created_at DESC', async () => {
      const requests = [makeLeaveRequest(), makeLeaveRequest({ id: 'lr-2', totalDays: 3 })];
      mockQuery.mockResolvedValueOnce({ rows: requests });

      const result = await repo.findByEmployeeId('emp-1');

      expect(result).toEqual(requests);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE employee_id = $1 ORDER BY created_at DESC',
        ['emp-1']
      );
    });

    it('should return empty array when employee has no requests', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployeeId('emp-none');

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return a leave request when found', async () => {
      const request = makeLeaveRequest();
      mockQuery.mockResolvedValueOnce({ rows: [request] });

      const result = await repo.findById('lr-1');

      expect(result).toEqual(request);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE id = $1',
        ['lr-1']
      );
    });

    it('should return null when leave request is not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByManagerId', () => {
    it('should return leave requests for a manager ordered by created_at DESC', async () => {
      const requests = [makeLeaveRequest(), makeLeaveRequest({ id: 'lr-2', employeeId: 'emp-2' })];
      mockQuery.mockResolvedValueOnce({ rows: requests });

      const result = await repo.findByManagerId('mgr-1');

      expect(result).toEqual(requests);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE manager_id = $1 ORDER BY created_at DESC',
        ['mgr-1']
      );
    });

    it('should return empty array when manager has no requests', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByManagerId('mgr-none');

      expect(result).toEqual([]);
    });
  });

  describe('findByStatus', () => {
    it('should return leave requests with a given status', async () => {
      const requests = [makeLeaveRequest({ status: LeaveStatus.APPROVED })];
      mockQuery.mockResolvedValueOnce({ rows: requests });

      const result = await repo.findByStatus(LeaveStatus.APPROVED);

      expect(result).toEqual(requests);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE status = $1 ORDER BY created_at DESC',
        [LeaveStatus.APPROVED]
      );
    });

    it('should return empty array when no requests have the given status', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByStatus(LeaveStatus.REJECTED);

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should insert a new leave request with PENDING status and return it', async () => {
      const dto = makeCreateDto();
      const created = makeLeaveRequest();
      mockQuery.mockResolvedValueOnce({ rows: [created] });

      const result = await repo.create(dto);

      expect(result).toEqual(created);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_requests'),
        [dto.employeeId, dto.leaveTypeId, dto.startDate, dto.endDate, dto.totalDays, dto.reason, LeaveStatus.PENDING, dto.managerId]
      );
    });
  });

  describe('updateStatus', () => {
    it('should approve a leave request and set approvedBy and approvedAt', async () => {
      const approved = makeLeaveRequest({
        status: LeaveStatus.APPROVED,
        approvedBy: 'mgr-1',
        approvedAt: new Date('2025-05-25T00:00:00Z'),
      });
      mockQuery.mockResolvedValueOnce({ rows: [approved] });

      const result = await repo.updateStatus('lr-1', LeaveStatus.APPROVED, 'mgr-1');

      expect(result).toEqual(approved);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_requests SET'),
        expect.arrayContaining(['lr-1', LeaveStatus.APPROVED, 'mgr-1'])
      );
    });

    it('should reject a leave request and set rejectionReason', async () => {
      const rejected = makeLeaveRequest({
        status: LeaveStatus.REJECTED,
        rejectionReason: 'Insufficient staffing',
      });
      mockQuery.mockResolvedValueOnce({ rows: [rejected] });

      const result = await repo.updateStatus('lr-1', LeaveStatus.REJECTED, undefined, 'Insufficient staffing');

      expect(result).toEqual(rejected);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_requests SET'),
        expect.arrayContaining(['lr-1', LeaveStatus.REJECTED, 'Insufficient staffing'])
      );
    });

    it('should cancel a leave request and set cancelledAt', async () => {
      const cancelled = makeLeaveRequest({
        status: LeaveStatus.CANCELLED,
        cancelledAt: new Date('2025-05-25T00:00:00Z'),
      });
      mockQuery.mockResolvedValueOnce({ rows: [cancelled] });

      const result = await repo.updateStatus('lr-1', LeaveStatus.CANCELLED);

      expect(result).toEqual(cancelled);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_requests SET'),
        expect.arrayContaining(['lr-1', LeaveStatus.CANCELLED])
      );
    });

    it('should return null when leave request does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.updateStatus('nonexistent', LeaveStatus.APPROVED, 'mgr-1');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all leave requests ordered by created_at DESC', async () => {
      const requests = [makeLeaveRequest(), makeLeaveRequest({ id: 'lr-2' })];
      mockQuery.mockResolvedValueOnce({ rows: requests });

      const result = await repo.findAll();

      expect(result).toEqual(requests);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests ORDER BY created_at DESC'
      );
    });

    it('should return empty array when no leave requests exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findAll();

      expect(result).toEqual([]);
    });
  });
});
