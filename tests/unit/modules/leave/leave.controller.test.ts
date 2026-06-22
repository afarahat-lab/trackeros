import { LeaveController } from '../../../../src/modules/leave/leave.controller';
import { LeaveService } from '../../../../src/modules/leave/leave.service';
import { BalanceService } from '../../../../src/modules/balance/balance.service';
import { LeaveRequestStatus } from '../../../../src/modules/leave/leave.model';

describe('LeaveController', () => {
  let controller: LeaveController;
  let leaveService: jest.Mocked<any>;
  let balanceService: jest.Mocked<any>;
  let mockReply: any;

  beforeEach(() => {
    leaveService = {
      applyLeave: jest.fn(),
      approveLeave: jest.fn(),
      rejectLeave: jest.fn(),
      cancelLeave: jest.fn(),
      getLeaveRequest: jest.fn(),
      getLeaveRequests: jest.fn(),
    };

    balanceService = {
      getBalance: jest.fn(),
    };

    controller = new LeaveController(leaveService as any, balanceService as any);

    mockReply = {
      code: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
  });

  const mockRequest = (overrides: any = {}) => ({
    user: { id: 'user-1', role: 'employee' },
    body: {},
    params: {},
    query: {},
    ...overrides,
  });

  it('should apply leave', async () => {
    const dto = { leaveTypeId: 'lt-1', startDate: new Date(), endDate: new Date(), daysRequested: 1 };
    const mockLeave = { id: 'l-1', ...dto, status: LeaveRequestStatus.SUBMITTED };
    leaveService.applyLeave.mockResolvedValue(mockLeave);

    const req = mockRequest({ body: dto });
    await controller.applyLeave(req as any, mockReply);

    expect(leaveService.applyLeave).toHaveBeenCalledWith('user-1', dto);
    expect(mockReply.code).toHaveBeenCalledWith(201);
    expect(mockReply.send).toHaveBeenCalledWith(mockLeave);
  });

  it('should approve leave', async () => {
    const mockLeave = { id: 'l-1', status: LeaveRequestStatus.APPROVED };
    leaveService.approveLeave.mockResolvedValue(mockLeave);

    const req = mockRequest({ params: { id: 'l-1' } });
    await controller.approveLeave(req as any, mockReply);

    expect(leaveService.approveLeave).toHaveBeenCalledWith('l-1', 'user-1');
    expect(mockReply.send).toHaveBeenCalledWith(mockLeave);
  });

  it('should reject leave', async () => {
    const mockLeave = { id: 'l-1', status: LeaveRequestStatus.REJECTED };
    leaveService.rejectLeave.mockResolvedValue(mockLeave);

    const req = mockRequest({ params: { id: 'l-1' }, body: { reason: 'Too busy' } });
    await controller.rejectLeave(req as any, mockReply);

    expect(leaveService.rejectLeave).toHaveBeenCalledWith('l-1', 'user-1', 'Too busy');
    expect(mockReply.send).toHaveBeenCalledWith(mockLeave);
  });

  it('should cancel leave', async () => {
    const mockLeave = { id: 'l-1', status: LeaveRequestStatus.CANCELLED };
    leaveService.cancelLeave.mockResolvedValue(mockLeave);

    const req = mockRequest({ params: { id: 'l-1' } });
    await controller.cancelLeave(req as any, mockReply);

    expect(leaveService.cancelLeave).toHaveBeenCalledWith('l-1', 'user-1');
    expect(mockReply.send).toHaveBeenCalledWith(mockLeave);
  });

  it('should get leave request', async () => {
    const mockLeave = { id: 'l-1' };
    leaveService.getLeaveRequest.mockResolvedValue(mockLeave);

    const req = mockRequest({ params: { id: 'l-1' } });
    await controller.getLeaveRequest(req as any, mockReply);

    expect(leaveService.getLeaveRequest).toHaveBeenCalledWith('l-1');
    expect(mockReply.send).toHaveBeenCalledWith(mockLeave);
  });

  it('should get leave requests', async () => {
    const mockLeaves = [{ id: 'l-1' }];
    leaveService.getLeaveRequests.mockResolvedValue(mockLeaves);

    const req = mockRequest({ query: { status: 'approved' } });
    await controller.getLeaveRequests(req as any, mockReply);

    expect(leaveService.getLeaveRequests).toHaveBeenCalledWith({ status: 'approved' });
    expect(mockReply.send).toHaveBeenCalledWith(mockLeaves);
  });

  it('should get leave balance', async () => {
    const mockBalance = { totalDays: 20, usedDays: 5 };
    balanceService.getBalance.mockResolvedValue(mockBalance);

    const req = mockRequest({ query: { leaveTypeId: 'lt-1', year: 2023 } });
    await controller.getLeaveBalance(req as any, mockReply);

    expect(balanceService.getBalance).toHaveBeenCalledWith('user-1', 'lt-1', 2023);
    expect(mockReply.send).toHaveBeenCalledWith(mockBalance);
  });
});
