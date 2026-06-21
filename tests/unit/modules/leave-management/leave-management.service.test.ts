import { LeaveManagementService, ValidationError, NotFoundError, InsufficientBalanceError, BadRequestError, ForbiddenError, ConflictError } from '../../../../src/modules/leave-management/leave-management.service';

describe('LeaveManagementService', () => {
  let service: LeaveManagementService;
  let mockLeaveRepo: any;
  let mockPolicyRepo: any;
  let mockBalanceRepo: any;
  let mockAuditRepo: any;
  let mockEmployeeRepo: any;
  let mockNotificationRepo: any;
  let mockClient: any;
  let mockPool: any;

  beforeEach(() => {
    mockLeaveRepo = {
      create: jest.fn(),
      updateStatus: jest.fn(),
      findById: jest.fn(),
    };
    mockPolicyRepo = {
      findByLeaveTypeId: jest.fn(),
    };
    mockBalanceRepo = {
      findByEmployeeIdAndLeaveTypeIdAndYear: jest.fn(),
      update: jest.fn(),
    };
    mockAuditRepo = {
      create: jest.fn(),
    };
    mockEmployeeRepo = {
      findById: jest.fn(),
    };
    mockNotificationRepo = {
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
      mockEmployeeRepo,
      mockNotificationRepo,
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

    const result = await service.createLeaveRequest(validDto, { id: 'emp1', role: 'employee' });

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
    await expect(service.createLeaveRequest(invalidDto, { id: 'emp1', role: 'employee' })).rejects.toThrow(ValidationError);
  });

  it('ValidationError: endDate before startDate', async () => {
    const invalidDto = { ...validDto, startDate: new Date('2023-10-05'), endDate: new Date('2023-10-01') };
    await expect(service.createLeaveRequest(invalidDto, { id: 'emp1', role: 'employee' })).rejects.toThrow(ValidationError);
  });

  it('NotFoundError: leave policy not found', async () => {
    mockPolicyRepo.findByLeaveTypeId.mockResolvedValue(null);
    await expect(service.createLeaveRequest(validDto, { id: 'emp1', role: 'employee' })).rejects.toThrow(NotFoundError);
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('InsufficientBalanceError: balance insufficient', async () => {
    mockPolicyRepo.findByLeaveTypeId.mockResolvedValue({ id: 'p1' });
    mockBalanceRepo.findByEmployeeIdAndLeaveTypeIdAndYear.mockResolvedValue({
      totalEntitlement: 2,
      usedDays: 2,
      pendingDays: 0,
    });
    await expect(service.createLeaveRequest(validDto, { id: 'emp1', role: 'employee' })).rejects.toThrow(InsufficientBalanceError);
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

    await expect(service.createLeaveRequest(validDto, { id: 'emp1', role: 'employee' })).rejects.toThrow('DB Error');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });

  describe('approveLeave', () => {
    const leaveId = '123e4567-e89b-12d3-a456-426614174000';
    const approverId = '123e4567-e89b-12d3-a456-426614174001';
    const employeeId = '123e4567-e89b-12d3-a456-426614174002';
    
    const mockLeaveRequest = {
      id: leaveId,
      employeeId,
      leaveTypeId: 'lt1',
      startDate: new Date('2023-10-01'),
      endDate: new Date('2023-10-02'),
      status: 'submitted',
    };

    const mockApprover = { id: approverId, role: 'manager' };
    const mockEmployee = { id: employeeId, managerId: approverId };
    const mockBalance = { id: 'bal1', usedDays: 0, pendingDays: 2 };

    beforeEach(() => {
      mockLeaveRepo.findById.mockResolvedValue(mockLeaveRequest);
      mockEmployeeRepo.findById.mockImplementation((id: string) => {
        if (id === approverId) return Promise.resolve(mockApprover);
        if (id === employeeId) return Promise.resolve(mockEmployee);
        return Promise.resolve(null);
      });
      mockBalanceRepo.findByEmployeeIdAndLeaveTypeIdAndYear.mockResolvedValue(mockBalance);
      mockLeaveRepo.updateStatus.mockResolvedValue({ ...mockLeaveRequest, status: 'approved', approverId });
      mockBalanceRepo.update.mockResolvedValue({ ...mockBalance, usedDays: 2, pendingDays: 0 });
      mockAuditRepo.create.mockResolvedValue({});
      mockNotificationRepo.create.mockResolvedValue({});
    });

    it('Success: approves leave, updates balance, creates audit and notification', async () => {
      const result = await service.approveLeaveRequest(leaveId, { id: approverId, role: 'manager' });
      expect(result.status).toBe('approved');
      expect(mockLeaveRepo.updateStatus).toHaveBeenCalledWith(leaveId, 'approved', approverId, undefined);
      expect(mockBalanceRepo.update).toHaveBeenCalledWith('bal1', { usedDays: 2, pendingDays: 0 });
      expect(mockAuditRepo.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'LEAVE_APPROVED' }));
      expect(mockNotificationRepo.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'LEAVE_APPROVED' }));
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('Throws BadRequestError: invalid leaveId UUID', async () => {
      await expect(service.approveLeaveRequest('invalid-uuid', { id: approverId, role: 'manager' })).rejects.toThrow(BadRequestError);
    });

    it('Throws BadRequestError: invalid approverId UUID', async () => {
      await expect(service.approveLeaveRequest(leaveId, { id: 'invalid-uuid', role: 'manager' })).rejects.toThrow(BadRequestError);
    });

    it('Throws NotFoundError: leave request not found', async () => {
      mockLeaveRepo.findById.mockResolvedValue(null);
      await expect(service.approveLeaveRequest(leaveId, { id: approverId, role: 'manager' })).rejects.toThrow(NotFoundError);
    });

    it('Throws NotFoundError: approver not found', async () => {
      mockEmployeeRepo.findById.mockResolvedValue(null);
      await expect(service.approveLeaveRequest(leaveId, { id: approverId, role: 'manager' })).rejects.toThrow(NotFoundError);
    });

    it('Throws ForbiddenError: approver is not a manager', async () => {
      mockEmployeeRepo.findById.mockImplementation((id: string) => {
        if (id === approverId) return Promise.resolve({ ...mockApprover, role: 'employee' });
        if (id === employeeId) return Promise.resolve(mockEmployee);
        return Promise.resolve(null);
      });
      await expect(service.approveLeaveRequest(leaveId, { id: approverId, role: 'manager' })).rejects.toThrow(ForbiddenError);
    });

    it('Throws ForbiddenError: approver is not the employee manager', async () => {
      mockEmployeeRepo.findById.mockImplementation((id: string) => {
        if (id === approverId) return Promise.resolve(mockApprover);
        if (id === employeeId) return Promise.resolve({ ...mockEmployee, managerId: 'other-manager' });
        return Promise.resolve(null);
      });
      await expect(service.approveLeaveRequest(leaveId, { id: approverId, role: 'manager' })).rejects.toThrow(ForbiddenError);
    });

    it('Throws BadRequestError: leave request not in pending status', async () => {
      mockLeaveRepo.findById.mockResolvedValue({ ...mockLeaveRequest, status: 'approved' });
      await expect(service.approveLeaveRequest(leaveId, { id: approverId, role: 'manager' })).rejects.toThrow(BadRequestError);
    });

    it('Transaction rollback: balance update fails', async () => {
      mockBalanceRepo.update.mockRejectedValue(new Error('DB Error'));
      await expect(service.approveLeaveRequest(leaveId, { id: approverId, role: 'manager' })).rejects.toThrow('DB Error');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('rejectLeave', () => {
    const leaveId = '123e4567-e89b-12d3-a456-426614174000';
    const approverId = '123e4567-e89b-12d3-a456-426614174001';
    const employeeId = '123e4567-e89b-12d3-a456-426614174002';
    
    const mockLeaveRequest = {
      id: leaveId,
      employeeId,
      leaveTypeId: 'lt1',
      startDate: new Date('2023-10-01'),
      endDate: new Date('2023-10-02'),
      status: 'submitted',
    };

    const mockApprover = { id: approverId, role: 'manager' };
    const mockEmployee = { id: employeeId, managerId: approverId };
    const mockBalance = { id: 'bal1', usedDays: 0, pendingDays: 2 };

    beforeEach(() => {
      mockLeaveRepo.findById.mockResolvedValue(mockLeaveRequest);
      mockEmployeeRepo.findById.mockImplementation((id: string) => {
        if (id === approverId) return Promise.resolve(mockApprover);
        if (id === employeeId) return Promise.resolve(mockEmployee);
        return Promise.resolve(null);
      });
      mockBalanceRepo.findByEmployeeIdAndLeaveTypeIdAndYear.mockResolvedValue(mockBalance);
      mockLeaveRepo.updateStatus.mockResolvedValue({ ...mockLeaveRequest, status: 'rejected', approverId });
      mockBalanceRepo.update.mockResolvedValue({ ...mockBalance, pendingDays: 0 });
      mockAuditRepo.create.mockResolvedValue({});
      mockNotificationRepo.create.mockResolvedValue({});
    });

    it('Success: rejects leave, releases pending days, creates audit and notification', async () => {
      const result = await service.rejectLeaveRequest(leaveId, { id: approverId, role: 'manager' }, 'Not enough coverage');
      expect(result.status).toBe('rejected');
      expect(mockLeaveRepo.updateStatus).toHaveBeenCalledWith(leaveId, 'rejected', approverId, 'Not enough coverage');
      expect(mockBalanceRepo.update).toHaveBeenCalledWith('bal1', { pendingDays: 0 });
      expect(mockAuditRepo.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'LEAVE_REJECTED' }));
      expect(mockNotificationRepo.create).toHaveBeenCalledWith(expect.objectContaining({ 
        type: 'LEAVE_REJECTED',
        message: expect.stringContaining('Not enough coverage')
      }));
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('Throws BadRequestError: invalid UUID formats', async () => {
      await expect(service.rejectLeaveRequest('invalid', { id: approverId, role: 'manager' }, 'Rejection reason')).rejects.toThrow(BadRequestError);
      await expect(service.rejectLeaveRequest(leaveId, { id: 'invalid', role: 'manager' }, 'Rejection reason')).rejects.toThrow(BadRequestError);
    });

    it('Throws ForbiddenError: unauthorized approver', async () => {
      mockEmployeeRepo.findById.mockImplementation((id: string) => {
        if (id === approverId) return Promise.resolve({ ...mockApprover, role: 'employee' });
        if (id === employeeId) return Promise.resolve(mockEmployee);
        return Promise.resolve(null);
      });
      await expect(service.rejectLeaveRequest(leaveId, { id: approverId, role: 'manager' }, 'Rejection reason')).rejects.toThrow(ForbiddenError);
    });
    
    it('Transaction rollback: audit log creation fails', async () => {
      mockAuditRepo.create.mockRejectedValue(new Error('Audit DB Error'));
      await expect(service.rejectLeaveRequest(leaveId, { id: approverId, role: 'manager' }, 'Rejection reason')).rejects.toThrow('Audit DB Error');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('cancelLeave', () => {
    const leaveId = '123e4567-e89b-12d3-a456-426614174000';
    const employeeId = '123e4567-e89b-12d3-a456-426614174002';
    
    const mockLeaveRequest = {
      id: leaveId,
      employeeId,
      leaveTypeId: 'lt1',
      startDate: new Date('2023-10-01'),
      endDate: new Date('2023-10-02'),
      status: 'submitted',
      approverId: '123e4567-e89b-12d3-a456-426614174001'
    };

    const mockBalance = { id: 'bal1', usedDays: 2, pendingDays: 2 };

    beforeEach(() => {
      mockLeaveRepo.findById.mockResolvedValue(mockLeaveRequest);
      mockBalanceRepo.findByEmployeeIdAndLeaveTypeIdAndYear.mockResolvedValue(mockBalance);
      mockLeaveRepo.updateStatus.mockResolvedValue({ ...mockLeaveRequest, status: 'cancelled' });
      mockBalanceRepo.update.mockResolvedValue({ ...mockBalance });
      mockAuditRepo.create.mockResolvedValue({});
      mockNotificationRepo.create.mockResolvedValue({});
    });

    it('Success: cancels submitted leave, adjusts pendingDays (inclusive days calculation)', async () => {
      const result = await service.cancelLeaveRequest(leaveId, { id: employeeId, role: 'employee' });
      expect(result.status).toBe('cancelled');
      // 2023-10-01 to 2023-10-02 is 2 days inclusive
      expect(mockBalanceRepo.update).toHaveBeenCalledWith('bal1', { pendingDays: 0 });
      expect(mockLeaveRepo.updateStatus).toHaveBeenCalledWith(leaveId, 'cancelled');
      expect(mockAuditRepo.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'cancelled' }));
      expect(mockNotificationRepo.create).toHaveBeenCalled();
    });

    it('Success: cancels approved leave, adjusts usedDays', async () => {
      mockLeaveRepo.findById.mockResolvedValue({ ...mockLeaveRequest, status: 'approved' });
      await service.cancelLeaveRequest(leaveId, { id: employeeId, role: 'employee' });
      expect(mockBalanceRepo.update).toHaveBeenCalledWith('bal1', { usedDays: 0 });
    });

    it('Throws NotFoundError: non-existent request', async () => {
      mockLeaveRepo.findById.mockResolvedValue(null);
      await expect(service.cancelLeaveRequest(leaveId, { id: employeeId, role: 'employee' })).rejects.toThrow(NotFoundError);
    });

    it('Throws ForbiddenError: request not owned by employee', async () => {
      mockLeaveRepo.findById.mockResolvedValue({ ...mockLeaveRequest, employeeId: 'other-emp' });
      await expect(service.cancelLeaveRequest(leaveId, { id: employeeId, role: 'employee' })).rejects.toThrow(ForbiddenError);
    });

    it('Throws ConflictError: invalid status (draft)', async () => {
      mockLeaveRepo.findById.mockResolvedValue({ ...mockLeaveRequest, status: 'draft' });
      await expect(service.cancelLeaveRequest(leaveId, { id: employeeId, role: 'employee' })).rejects.toThrow(ConflictError);
    });

    it('Throws ConflictError: invalid status (rejected)', async () => {
      mockLeaveRepo.findById.mockResolvedValue({ ...mockLeaveRequest, status: 'rejected' });
      await expect(service.cancelLeaveRequest(leaveId, { id: employeeId, role: 'employee' })).rejects.toThrow(ConflictError);
    });

    it('Throws ConflictError: invalid status (cancelled)', async () => {
      mockLeaveRepo.findById.mockResolvedValue({ ...mockLeaveRequest, status: 'cancelled' });
      await expect(service.cancelLeaveRequest(leaveId, { id: employeeId, role: 'employee' })).rejects.toThrow(ConflictError);
    });
  });

  describe('discardDraft', () => {
    const leaveId = '123e4567-e89b-12d3-a456-426614174000';
    const employeeId = '123e4567-e89b-12d3-a456-426614174002';
    
    const mockLeaveRequest = {
      id: leaveId,
      employeeId,
      leaveTypeId: 'lt1',
      startDate: new Date('2023-10-01'),
      endDate: new Date('2023-10-02'),
      status: 'draft',
    };

    beforeEach(() => {
      mockLeaveRepo.findById.mockResolvedValue(mockLeaveRequest);
      mockLeaveRepo.updateStatus.mockResolvedValue({ ...mockLeaveRequest, status: 'cancelled' });
      mockAuditRepo.create.mockResolvedValue({});
    });

    it('Success: discards draft and creates audit log', async () => {
      await service.discardDraftLeaveRequest(leaveId, { id: employeeId, role: 'employee' });
      expect(mockLeaveRepo.updateStatus).toHaveBeenCalledWith(leaveId, 'cancelled');
      expect(mockAuditRepo.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'discarded' }));
    });

    it('Throws NotFoundError: non-existent request', async () => {
      mockLeaveRepo.findById.mockResolvedValue(null);
      await expect(service.discardDraftLeaveRequest(leaveId, { id: employeeId, role: 'employee' })).rejects.toThrow(NotFoundError);
    });

    it('Throws ForbiddenError: request not owned by employee', async () => {
      mockLeaveRepo.findById.mockResolvedValue({ ...mockLeaveRequest, employeeId: 'other-emp' });
      await expect(service.discardDraftLeaveRequest(leaveId, { id: employeeId, role: 'employee' })).rejects.toThrow(ForbiddenError);
    });

    it('Throws ConflictError: non-draft status', async () => {
      mockLeaveRepo.findById.mockResolvedValue({ ...mockLeaveRequest, status: 'submitted' });
      await expect(service.discardDraftLeaveRequest(leaveId, { id: employeeId, role: 'employee' })).rejects.toThrow(ConflictError);
    });
  });
});
