import { LeaveController, AuthenticatedRequest } from '../../../src/modules/leave-api/leave.controller';
import { ILeaveManagementService } from '../../../src/modules/leave-management/leave-management.service.interface';

describe('LeaveController', () => {
  let controller: LeaveController;
  let mockService: jest.Mocked<ILeaveManagementService>;
  let mockReply: any;
  const mockUser = { employeeId: 'emp-1', role: 'employee', userId: 'user-1' };

  beforeEach(() => {
    mockService = {
      submitLeaveRequest: jest.fn(),
      approveLeaveRequest: jest.fn(),
      rejectLeaveRequest: jest.fn(),
      cancelLeaveRequest: jest.fn(),
      discardDraftLeaveRequest: jest.fn(),
      getLeaveHistory: jest.fn(),
      getLeaveBalances: jest.fn(),
    } as any;

    mockReply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    controller = new LeaveController(mockService);
  });

  const createRequest = (body: any = {}, params: any = {}) => {
    return { body, params, user: mockUser } as unknown as AuthenticatedRequest;
  };

  it('submit - success', async () => {
    const body = { leaveTypeId: '123e4567-e89b-12d3-a456-426614174000', startDate: '2023-01-01', endDate: '2023-01-02' };
    mockService.submitLeaveRequest.mockResolvedValue({ id: '1' } as any);
    
    await controller.submit(createRequest(body), mockReply);
    
    expect(mockService.submitLeaveRequest).toHaveBeenCalledWith('emp-1', expect.any(Object));
    expect(mockReply.status).toHaveBeenCalledWith(201);
    expect(mockReply.send).toHaveBeenCalledWith({ id: '1' });
  });

  it('submit - 400 validation error', async () => {
    const body = { leaveTypeId: 'not-uuid' };
    
    await controller.submit(createRequest(body), mockReply);
    
    expect(mockReply.status).toHaveBeenCalledWith(400);
    expect(mockService.submitLeaveRequest).not.toHaveBeenCalled();
  });

  it('submit - 500 service error', async () => {
    const body = { leaveTypeId: '123e4567-e89b-12d3-a456-426614174000', startDate: '2023-01-01', endDate: '2023-01-02' };
    mockService.submitLeaveRequest.mockRejectedValue(new Error('Service error'));
    
    await controller.submit(createRequest(body), mockReply);
    
    expect(mockReply.status).toHaveBeenCalledWith(500);
    expect(mockReply.send).toHaveBeenCalledWith({ message: 'Internal server error' });
  });

  it('approve - success', async () => {
    const body = { comment: 'Approved' };
    mockService.approveLeaveRequest.mockResolvedValue({ id: '1' } as any);
    
    await controller.approve(createRequest(body, { id: 'req-1' }), mockReply);
    
    expect(mockService.approveLeaveRequest).toHaveBeenCalledWith('req-1', 'emp-1', 'Approved');
    expect(mockReply.status).toHaveBeenCalledWith(200);
  });

  it('reject - success', async () => {
    const body = { comment: 'Rejected' };
    mockService.rejectLeaveRequest.mockResolvedValue({ id: '1' } as any);
    
    await controller.reject(createRequest(body, { id: 'req-1' }), mockReply);
    
    expect(mockService.rejectLeaveRequest).toHaveBeenCalledWith('req-1', 'emp-1', 'Rejected');
    expect(mockReply.status).toHaveBeenCalledWith(200);
  });

  it('cancel - success', async () => {
    mockService.cancelLeaveRequest.mockResolvedValue({ id: '1' } as any);
    
    await controller.cancel(createRequest({}, { id: 'req-1' }), mockReply);
    
    expect(mockService.cancelLeaveRequest).toHaveBeenCalledWith('req-1', 'emp-1');
    expect(mockReply.status).toHaveBeenCalledWith(200);
  });

  it('discard - success', async () => {
    mockService.discardDraftLeaveRequest.mockResolvedValue(undefined);
    
    await controller.discard(createRequest({}, { id: 'req-1' }), mockReply);
    
    expect(mockService.discardDraftLeaveRequest).toHaveBeenCalledWith('req-1', 'emp-1');
    expect(mockReply.status).toHaveBeenCalledWith(204);
  });

  it('history - success', async () => {
    mockService.getLeaveHistory.mockResolvedValue([]);
    
    await controller.history(createRequest(), mockReply);
    
    expect(mockService.getLeaveHistory).toHaveBeenCalledWith('emp-1');
    expect(mockReply.status).toHaveBeenCalledWith(200);
  });

  it('balances - success', async () => {
    mockService.getLeaveBalances.mockResolvedValue([]);
    
    await controller.balances(createRequest(), mockReply);
    
    expect(mockService.getLeaveBalances).toHaveBeenCalledWith('emp-1');
    expect(mockReply.status).toHaveBeenCalledWith(200);
  });
});
