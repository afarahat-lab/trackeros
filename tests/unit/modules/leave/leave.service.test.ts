import { LeaveService } from '../../../../src/modules/leave/leave.service';
import { ILeaveRepository } from '../../../../src/modules/leave/leave.repository';
import { LeaveStatus } from '../../../../src/shared/types/leave.types';
import { LeaveRequest, CreateLeaveRequestDto } from '../../../../src/modules/leave/leave.model';

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

function makeCreateDto(overrides: Partial<CreateLeaveRequestDto> = {}): CreateLeaveRequestDto {
  return {
    employeeId: 'emp-001',
    leaveTypeId: 'lt-001',
    startDate: new Date('2026-07-10'),
    endDate: new Date('2026-07-15'),
    reason: 'Vacation',
    ...overrides,
  };
}

describe('LeaveService', () => {
  let service: LeaveService;
  let mockRepo: jest.Mocked<ILeaveRepository>;

  beforeEach(() => {
    mockRepo = {
      findById: jest.fn(),
      findByEmployeeId: jest.fn(),
      findByStatus: jest.fn(),
      findByQueryParams: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    service = new LeaveService(mockRepo);
  });

  describe('createLeaveRequest', () => {
    it('should create a leave request when dates are valid', async () => {
      const dto = makeCreateDto();
      const expected = makeLeaveRequest();
      mockRepo.create.mockResolvedValueOnce(expected);

      const result = await service.createLeaveRequest(dto);

      expect(result).toEqual(expected);
      expect(mockRepo.create).toHaveBeenCalledWith(dto);
    });

    it('should throw when startDate is after endDate', async () => {
      const dto = makeCreateDto({
        startDate: new Date('2026-07-20'),
        endDate: new Date('2026-07-15'),
      });

      await expect(service.createLeaveRequest(dto)).rejects.toThrow(
        'startDate must be before endDate',
      );
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('should throw when startDate equals endDate', async () => {
      const dto = makeCreateDto({
        startDate: new Date('2026-07-15'),
        endDate: new Date('2026-07-15'),
      });

      await expect(service.createLeaveRequest(dto)).rejects.toThrow(
        'startDate must be before endDate',
      );
      expect(mockRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('approveLeave', () => {
    it('should approve a PENDING leave request', async () => {
      const pending = makeLeaveRequest({ status: LeaveStatus.PENDING });
      const approved = makeLeaveRequest({
        status: LeaveStatus.APPROVED,
        approvedBy: 'mgr-001',
        approvedAt: new Date('2026-07-02T10:00:00Z'),
      });
      mockRepo.findById.mockResolvedValueOnce(pending);
      mockRepo.update.mockResolvedValueOnce(approved);

      const result = await service.approveLeave('lr-001', 'mgr-001');

      expect(result.status).toBe(LeaveStatus.APPROVED);
      expect(result.approvedBy).toBe('mgr-001');
      expect(mockRepo.update).toHaveBeenCalledWith('lr-001', {
        status: LeaveStatus.APPROVED,
        approvedBy: 'mgr-001',
        approvedAt: expect.any(Date) as Date,
      });
    });

    it('should throw when leave request is not found', async () => {
      mockRepo.findById.mockResolvedValueOnce(null);

      await expect(service.approveLeave('nonexistent', 'mgr-001')).rejects.toThrow(
        'Leave request not found',
      );
    });

    it('should throw when leave request is not PENDING', async () => {
      const approved = makeLeaveRequest({ status: LeaveStatus.APPROVED });
      mockRepo.findById.mockResolvedValueOnce(approved);

      await expect(service.approveLeave('lr-001', 'mgr-001')).rejects.toThrow(
        'Only PENDING leave requests can be approved',
      );
    });

    it('should throw when update fails', async () => {
      const pending = makeLeaveRequest({ status: LeaveStatus.PENDING });
      mockRepo.findById.mockResolvedValueOnce(pending);
      mockRepo.update.mockResolvedValueOnce(null);

      await expect(service.approveLeave('lr-001', 'mgr-001')).rejects.toThrow(
        'Failed to approve leave request',
      );
    });
  });

  describe('rejectLeave', () => {
    it('should reject a PENDING leave request', async () => {
      const pending = makeLeaveRequest({ status: LeaveStatus.PENDING });
      const rejected = makeLeaveRequest({
        status: LeaveStatus.REJECTED,
        rejectedBy: 'mgr-001',
        rejectedAt: new Date('2026-07-02T10:00:00Z'),
        rejectionReason: 'Insufficient coverage',
      });
      mockRepo.findById.mockResolvedValueOnce(pending);
      mockRepo.update.mockResolvedValueOnce(rejected);

      const result = await service.rejectLeave('lr-001', 'mgr-001', 'Insufficient coverage');

      expect(result.status).toBe(LeaveStatus.REJECTED);
      expect(result.rejectedBy).toBe('mgr-001');
      expect(result.rejectionReason).toBe('Insufficient coverage');
      expect(mockRepo.update).toHaveBeenCalledWith('lr-001', {
        status: LeaveStatus.REJECTED,
        rejectedBy: 'mgr-001',
        rejectedAt: expect.any(Date) as Date,
        rejectionReason: 'Insufficient coverage',
      });
    });

    it('should throw when leave request is not found', async () => {
      mockRepo.findById.mockResolvedValueOnce(null);

      await expect(
        service.rejectLeave('nonexistent', 'mgr-001', 'reason'),
      ).rejects.toThrow('Leave request not found');
    });

    it('should throw when leave request is not PENDING', async () => {
      const cancelled = makeLeaveRequest({ status: LeaveStatus.CANCELLED });
      mockRepo.findById.mockResolvedValueOnce(cancelled);

      await expect(
        service.rejectLeave('lr-001', 'mgr-001', 'reason'),
      ).rejects.toThrow('Only PENDING leave requests can be rejected');
    });

    it('should throw when update fails', async () => {
      const pending = makeLeaveRequest({ status: LeaveStatus.PENDING });
      mockRepo.findById.mockResolvedValueOnce(pending);
      mockRepo.update.mockResolvedValueOnce(null);

      await expect(
        service.rejectLeave('lr-001', 'mgr-001', 'reason'),
      ).rejects.toThrow('Failed to reject leave request');
    });
  });

  describe('cancelLeave', () => {
    it('should cancel an APPROVED leave request', async () => {
      const approved = makeLeaveRequest({ status: LeaveStatus.APPROVED });
      const cancelled = makeLeaveRequest({
        status: LeaveStatus.CANCELLED,
        cancelledBy: 'emp-001',
        cancelledAt: new Date('2026-07-03T10:00:00Z'),
        cancellationReason: 'No longer needed',
      });
      mockRepo.findById.mockResolvedValueOnce(approved);
      mockRepo.update.mockResolvedValueOnce(cancelled);

      const result = await service.cancelLeave('lr-001', 'emp-001', 'No longer needed');

      expect(result.status).toBe(LeaveStatus.CANCELLED);
      expect(result.cancelledBy).toBe('emp-001');
      expect(result.cancellationReason).toBe('No longer needed');
      expect(mockRepo.update).toHaveBeenCalledWith('lr-001', {
        status: LeaveStatus.CANCELLED,
        cancelledBy: 'emp-001',
        cancelledAt: expect.any(Date) as Date,
        cancellationReason: 'No longer needed',
      });
    });

    it('should throw when leave request is not found', async () => {
      mockRepo.findById.mockResolvedValueOnce(null);

      await expect(
        service.cancelLeave('nonexistent', 'emp-001', 'reason'),
      ).rejects.toThrow('Leave request not found');
    });

    it('should throw when leave request is not APPROVED', async () => {
      const pending = makeLeaveRequest({ status: LeaveStatus.PENDING });
      mockRepo.findById.mockResolvedValueOnce(pending);

      await expect(
        service.cancelLeave('lr-001', 'emp-001', 'reason'),
      ).rejects.toThrow('Only APPROVED leave requests can be cancelled');
    });

    it('should throw when update fails', async () => {
      const approved = makeLeaveRequest({ status: LeaveStatus.APPROVED });
      mockRepo.findById.mockResolvedValueOnce(approved);
      mockRepo.update.mockResolvedValueOnce(null);

      await expect(
        service.cancelLeave('lr-001', 'emp-001', 'reason'),
      ).rejects.toThrow('Failed to cancel leave request');
    });
  });

  describe('getLeaveRequestById', () => {
    it('should return a leave request when found', async () => {
      const expected = makeLeaveRequest();
      mockRepo.findById.mockResolvedValueOnce(expected);

      const result = await service.getLeaveRequestById('lr-001');

      expect(result).toEqual(expected);
      expect(mockRepo.findById).toHaveBeenCalledWith('lr-001');
    });

    it('should return null when not found', async () => {
      mockRepo.findById.mockResolvedValueOnce(null);

      const result = await service.getLeaveRequestById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getLeaveRequestsByEmployee', () => {
    it('should return leave requests for an employee', async () => {
      const requests = [makeLeaveRequest(), makeLeaveRequest({ id: 'lr-002' })];
      mockRepo.findByEmployeeId.mockResolvedValueOnce(requests);

      const result = await service.getLeaveRequestsByEmployee('emp-001');

      expect(result).toHaveLength(2);
      expect(mockRepo.findByEmployeeId).toHaveBeenCalledWith('emp-001');
    });

    it('should return empty array when no requests found', async () => {
      mockRepo.findByEmployeeId.mockResolvedValueOnce([]);

      const result = await service.getLeaveRequestsByEmployee('emp-999');

      expect(result).toEqual([]);
    });
  });

  describe('getLeaveRequestsByStatus', () => {
    it('should return leave requests filtered by status', async () => {
      const requests = [makeLeaveRequest({ status: LeaveStatus.APPROVED })];
      mockRepo.findByStatus.mockResolvedValueOnce(requests);

      const result = await service.getLeaveRequestsByStatus(LeaveStatus.APPROVED);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(LeaveStatus.APPROVED);
      expect(mockRepo.findByStatus).toHaveBeenCalledWith(LeaveStatus.APPROVED);
    });

    it('should return empty array when no requests match', async () => {
      mockRepo.findByStatus.mockResolvedValueOnce([]);

      const result = await service.getLeaveRequestsByStatus(LeaveStatus.REJECTED);

      expect(result).toEqual([]);
    });
  });
});
