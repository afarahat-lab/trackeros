import { LeaveController } from '../../../../src/modules/leave-api/leave.controller';
import { ILeaveManagementService } from '../../../../src/modules/leave-management/leave-management.service.interface';

describe('LeaveController', () => {
  let controller: LeaveController;
  let service: jest.Mocked<ILeaveManagementService>;
  let mockRequest: any;
  let mockReply: any;

  beforeEach(() => {
    service = {
      submitLeaveRequest: jest.fn(),
      approveLeaveRequest: jest.fn(),
      rejectLeaveRequest: jest.fn(),
      cancelLeaveRequest: jest.fn(),
      discardDraftLeaveRequest: jest.fn(),
      getLeaveBalance: jest.fn(),
      getLeaveHistory: jest.fn(),
    } as unknown as jest.Mocked<ILeaveManagementService>;

    controller = new LeaveController(service);

    mockReply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      user: { employeeId: 'emp1', role: 'employee' },
      body: {},
      params: {},
      query: {},
    };
  });

  describe('submitLeave', () => {
    it('should submit leave request successfully', async () => {
      const dto = { leaveTypeId: 'type1', startDate: '2023-01-01', endDate: '2023-01-02', reason: 'Vacation' };
      mockRequest.body = dto;
      const mockResult = { id: '1', ...dto, status: 'submitted' };
      service.submitLeaveRequest.mockResolvedValue(mockResult as any);

      await controller.submitLeave(mockRequest, mockReply);

      expect(service.submitLeaveRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: 'emp1',
          leaveTypeId: 'type1',
          startDate: expect.any(Date),
          endDate: expect.any(Date),
          reason: 'Vacation'
        }),
        { id: 'emp1', role: 'employee' }
      );
      expect(mockReply.status).toHaveBeenCalledWith(201);
      expect(mockReply.send).toHaveBeenCalledWith(mockResult);
    });

    it('should handle validation errors', async () => {
      mockRequest.body = { leaveTypeId: 'type1', startDate: 'invalid', endDate: '2023-01-02' };
      const error = { name: 'ValidationError', message: 'Invalid dates' };
      service.submitLeaveRequest.mockRejectedValue(error);

      await controller.submitLeave(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Invalid dates' });
    });
  });

  describe('approveLeave', () => {
    it('should approve leave request successfully', async () => {
      mockRequest.params = { id: 'leave1' };
      mockRequest.body = { comment: 'Approved' };
      mockRequest.user.role = 'manager';
      const mockResult = { id: 'leave1', status: 'approved' };
      service.approveLeaveRequest.mockResolvedValue(mockResult as any);

      await controller.approveLeave(mockRequest, mockReply);

      expect(service.approveLeaveRequest).toHaveBeenCalledWith('leave1', 'Approved', { id: 'emp1', role: 'manager' });
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('rejectLeave', () => {
    it('should reject leave request successfully', async () => {
      mockRequest.params = { id: 'leave1' };
      mockRequest.body = { comment: 'Rejected' };
      mockRequest.user.role = 'manager';
      const mockResult = { id: 'leave1', status: 'rejected' };
      service.rejectLeaveRequest.mockResolvedValue(mockResult as any);

      await controller.rejectLeave(mockRequest, mockReply);

      expect(service.rejectLeaveRequest).toHaveBeenCalledWith('leave1', 'Rejected', { id: 'emp1', role: 'manager' });
      expect(mockReply.status).toHaveBeenCalledWith(200);
    });
  });

  describe('cancelLeave', () => {
    it('should cancel leave request successfully', async () => {
      mockRequest.params = { id: 'leave1' };
      const mockResult = { id: 'leave1', status: 'cancelled' };
      service.cancelLeaveRequest.mockResolvedValue(mockResult as any);

      await controller.cancelLeave(mockRequest, mockReply);

      expect(service.cancelLeaveRequest).toHaveBeenCalledWith('leave1', { id: 'emp1', role: 'employee' });
      expect(mockReply.status).toHaveBeenCalledWith(200);
    });
  });

  describe('discardDraft', () => {
    it('should discard draft leave request successfully', async () => {
      mockRequest.params = { id: 'leave1' };
      service.discardDraftLeaveRequest.mockResolvedValue(undefined);

      await controller.discardDraft(mockRequest, mockReply);

      expect(service.discardDraftLeaveRequest).toHaveBeenCalledWith('leave1', { id: 'emp1', role: 'employee' });
      expect(mockReply.status).toHaveBeenCalledWith(204);
      expect(mockReply.send).toHaveBeenCalled();
    });
  });

  describe('getLeaveBalance', () => {
    it('should get leave balance successfully', async () => {
      mockRequest.params = { employeeId: 'emp1' };
      const mockBalance = [{ employeeId: 'emp1', totalEntitlement: 20 }];
      service.getLeaveBalance.mockResolvedValue(mockBalance as any);

      await controller.getLeaveBalance(mockRequest, mockReply);

      expect(service.getLeaveBalance).toHaveBeenCalledWith('emp1', { id: 'emp1', role: 'employee' });
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith(mockBalance);
    });
  });

  describe('getLeaveHistory', () => {
    it('should get leave history successfully', async () => {
      mockRequest.query = { year: '2023', status: 'approved' };
      const mockHistory = [{ id: 'leave1', status: 'approved' }];
      service.getLeaveHistory.mockResolvedValue(mockHistory as any);

      await controller.getLeaveHistory(mockRequest, mockReply);

      expect(service.getLeaveHistory).toHaveBeenCalledWith(
        { employeeId: undefined, status: 'approved', year: 2023 },
        { id: 'emp1', role: 'employee' }
      );
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith(mockHistory);
    });
  });

  describe('error handling', () => {
    it('should handle NotFoundError', async () => {
      mockRequest.params = { id: 'leave1' };
      const error = { name: 'NotFoundError', message: 'Not found' };
      service.cancelLeaveRequest.mockRejectedValue(error);

      await controller.cancelLeave(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Not found' });
    });

    it('should handle ForbiddenError', async () => {
      mockRequest.params = { id: 'leave1' };
      const error = { name: 'ForbiddenError', message: 'Forbidden' };
      service.cancelLeaveRequest.mockRejectedValue(error);

      await controller.cancelLeave(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Forbidden' });
    });

    it('should handle internal server errors', async () => {
      mockRequest.params = { id: 'leave1' };
      const error = new Error('Unknown error');
      service.cancelLeaveRequest.mockRejectedValue(error);

      await controller.cancelLeave(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });
});
