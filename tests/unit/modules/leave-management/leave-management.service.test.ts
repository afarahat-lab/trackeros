import { LeaveManagementService, ValidationError, NotFoundError, InsufficientBalanceError } from '../../../../src/modules/leave-management/leave-management.service';

describe('LeaveManagementService', () => {
  let service: LeaveManagementService;
  let mockLeaveRepo: any;
  let mockPolicyRepo: any;
  let mockBalanceRepo: any;
  let mockAuditRepo: any;
  let mockClient: any;
  let mockPool: any;

  beforeEach(() => {
    mockLeaveRepo = {
      create: jest.fn(),
      updateStatus: jest.fn(),
    };
    mockPolicyRepo = {
      findByLeaveTypeId: jest.fn(),
    };
    mockBalanceRepo = {
      findByEmployeeIdAndLeaveTypeIdAndYear: jest.fn(),
    };
    mockAuditRepo = {
      create: jest.fn(),
    };
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    mockPool = {
      connect: jest.fn().mockReturnValue(mockClient),
    };

    service = new LeaveManagementService(
      mockLeaveRepo,
      mockPolicyRepo,
      mockBalanceRepo,
      mockAuditRepo,
      mockPool
    );
  });

  const validDto = {
    employeeId: 'emp1',
    leaveTypeId: 'lt1',
    startDate: new Date('2023-10-01'),
    endDate: new Date('2023-10-02'),
  };

  it('Success: valid data, creates draft, transitions to submitted, logs audit, commits', async () => {
    mockPolicyRepo.findByLeaveTypeId.mockResolvedValue({ id: 'p1' });
    mockBalanceRepo.findByEmployeeIdAndLeaveTypeIdAndYear.mockResolvedValue({
      totalEntitlement: 10,
      usedDays: 2,
      pendingDays: 0,
    });
    
    const draftReq = { id: 'req1', ...validDto, status: 'draft' };
    const submittedReq = { ...draftReq, status: 'submitted' };
    
    mockLeaveRepo.create.mockResolvedValue(draftReq);
    mockLeaveRepo.updateStatus.mockResolvedValue(submittedReq);
    mockAuditRepo.create.mockResolvedValue({});

    const result = await service.applyForLeave(validDto);

    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockPolicyRepo.findByLeaveTypeId).toHaveBeenCalledWith('lt1');
    expect(mockBalanceRepo.findByEmployeeIdAndLeaveTypeIdAndYear).toHaveBeenCalledWith('emp1', 'lt1', 2023);
    expect(mockLeaveRepo.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'draft' }));
    expect(mockLeaveRepo.updateStatus).toHaveBeenCalledWith('req1', 'submitted');
    expect(mockAuditRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      entityType: 'leave_request',
      entityId: 'req1',
      action: 'SUBMITTED',
      changedBy: 'emp1',
    }));
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    expect(mockClient.release).toHaveBeenCalled();
    expect(result).toEqual(submittedReq);
  });

  it('ValidationError: missing required fields', async () => {
    const invalidDto = { ...validDto, employeeId: '' };
    await expect(service.applyForLeave(invalidDto)).rejects.toThrow(ValidationError);
  });

  it('ValidationError: endDate before startDate', async () => {
    const invalidDto = { ...validDto, startDate: new Date('2023-10-05'), endDate: new Date('2023-10-01') };
    await expect(service.applyForLeave(invalidDto)).rejects.toThrow(ValidationError);
  });

  it('NotFoundError: leave policy not found', async () => {
    mockPolicyRepo.findByLeaveTypeId.mockResolvedValue(null);
    await expect(service.applyForLeave(validDto)).rejects.toThrow(NotFoundError);
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('InsufficientBalanceError: balance insufficient', async () => {
    mockPolicyRepo.findByLeaveTypeId.mockResolvedValue({ id: 'p1' });
    mockBalanceRepo.findByEmployeeIdAndLeaveTypeIdAndYear.mockResolvedValue({
      totalEntitlement: 2,
      usedDays: 2,
      pendingDays: 0,
    });
    await expect(service.applyForLeave(validDto)).rejects.toThrow(InsufficientBalanceError);
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('Transaction rollback: DB error during creation triggers ROLLBACK', async () => {
    mockPolicyRepo.findByLeaveTypeId.mockResolvedValue({ id: 'p1' });
    mockBalanceRepo.findByEmployeeIdAndLeaveTypeIdAndYear.mockResolvedValue({
      totalEntitlement: 10,
      usedDays: 0,
      pendingDays: 0,
    });
    mockLeaveRepo.create.mockRejectedValue(new Error('DB Error'));

    await expect(service.applyForLeave(validDto)).rejects.toThrow('DB Error');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });
});
