import { LeaveManagementService } from './leave-management.service';
import { Pool } from 'pg';

const mockLeaveRepo = {
  create: jest.fn(),
  findById: jest.fn(),
  findByEmployeeId: jest.fn(),
  findByApproverId: jest.fn(),
  update: jest.fn(),
  updateStatus: jest.fn(),
};

const mockLeaveTypeRepo = { 
  findById: jest.fn(), 
  findAll: jest.fn() 
};

const mockPolicyRepo = { 
  findByLeaveTypeId: jest.fn() 
};

const mockBalanceRepo = {
  findById: jest.fn(),
  findByEmployeeIdAndYear: jest.fn(),
  findByEmployeeIdAndLeaveTypeIdAndYear: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

const mockAuditRepo = { 
  create: jest.fn(),
  findById: jest.fn(),
  findByEntity: jest.fn(),
};

const mockEmployeeRepo = {
  findById: jest.fn(),
  findByEmail: jest.fn(),
  findByManagerId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

const mockNotificationRepo = { 
  create: jest.fn(),
  findById: jest.fn(),
  findByRecipient: jest.fn(),
  markAsRead: jest.fn(),
};

const mockAuditService = { 
  log: jest.fn() 
};

const mockPool = {
  connect: jest.fn().mockReturnValue({
    query: jest.fn(),
    release: jest.fn(),
  }),
};

describe('LeaveManagementService', () => {
  let service: LeaveManagementService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LeaveManagementService(
      mockLeaveRepo as any,
      mockBalanceRepo as any,
      mockLeaveTypeRepo as any,
      mockPolicyRepo as any,
      mockEmployeeRepo as any,
      mockAuditService as any,
      mockPool as any
    );
  });

  describe('RBAC Enforcement', () => {
    it('should prevent non-manager from approving', async () => {
      mockLeaveRepo.findById.mockResolvedValue({ id: '1', employeeId: '2', status: 'submitted' });
      await expect(service.approveLeaveRequest('1', { id: '3', role: 'employee' })).rejects.toThrow('Only managers can approve requests');
    });

    it('should prevent manager from approving requests for non-team members', async () => {
      mockLeaveRepo.findById.mockResolvedValue({ id: '1', employeeId: '2', status: 'submitted' });
      mockEmployeeRepo.findById.mockResolvedValue({ id: '2', managerId: '99' });
      await expect(service.approveLeaveRequest('1', { id: '3', role: 'manager' })).rejects.toThrow('Not authorized to approve this request');
    });

    it('should prevent employee from cancelling another\'s request', async () => {
      mockLeaveRepo.findById.mockResolvedValue({ id: '1', employeeId: '2', status: 'submitted' });
      await expect(service.cancelLeaveRequest('1', { id: '3', role: 'employee' })).rejects.toThrow('Not authorized to cancel this request');
    });

    it('should allow employee to discard only their own drafts', async () => {
      mockLeaveRepo.findById.mockResolvedValue({ id: '1', employeeId: '2', status: 'draft' });
      await expect(service.discardDraftLeaveRequest('1', { id: '3', role: 'employee' })).rejects.toThrow('Can only discard own drafts');
    });
  });

  describe('Read Operations', () => {
    it('should scope getLeaveBalance correctly for employee', async () => {
      mockBalanceRepo.findByEmployeeIdAndYear.mockResolvedValue([]);
      await service.getLeaveBalance('1', { id: '1', role: 'employee' });
      expect(mockBalanceRepo.findByEmployeeIdAndYear).toHaveBeenCalledWith('1', expect.any(Number));
      
      await expect(service.getLeaveBalance('2', { id: '1', role: 'employee' })).rejects.toThrow('Cannot view other balances');
    });

    it('should scope getLeaveBalance correctly for manager', async () => {
      mockEmployeeRepo.findById.mockResolvedValue({ id: '2', managerId: '1' });
      mockBalanceRepo.findByEmployeeIdAndYear.mockResolvedValue([]);
      await service.getLeaveBalance('2', { id: '1', role: 'manager' });
      expect(mockBalanceRepo.findByEmployeeIdAndYear).toHaveBeenCalledWith('2', expect.any(Number));
    });

    it('should scope getLeaveHistory correctly for employee', async () => {
      mockLeaveRepo.findByEmployeeId.mockResolvedValue([]);
      await service.getLeaveHistory({}, { id: '1', role: 'employee' });
      expect(mockLeaveRepo.findByEmployeeId).toHaveBeenCalledWith('1');
    });

    it('should scope getLeaveHistory correctly for manager', async () => {
      mockEmployeeRepo.findById.mockResolvedValue({ id: '2', managerId: '1' });
      mockLeaveRepo.findByEmployeeId.mockResolvedValue([]);
      await service.getLeaveHistory({ employeeId: '2' }, { id: '1', role: 'manager' });
      expect(mockLeaveRepo.findByEmployeeId).toHaveBeenCalledWith('2');
    });
  });

  describe('Audit Logging', () => {
    const baseRequest = { id: '1', employeeId: '2', status: 'draft', startDate: new Date(), endDate: new Date(), leaveTypeId: 'lt1' };
    
    it('should log audit on submit', async () => {
      mockLeaveRepo.findById.mockResolvedValue({ ...baseRequest, status: 'draft' });
      mockBalanceRepo.findByEmployeeIdAndLeaveTypeIdAndYear.mockResolvedValue({ id: 'b1', totalEntitlement: 10, usedDays: 0, pendingDays: 0 });
      mockLeaveRepo.updateStatus.mockResolvedValue({ ...baseRequest, status: 'submitted' });
      
      await service.submitLeaveRequest('1', { id: '2', role: 'employee' });
      expect(mockAuditService.log).toHaveBeenCalledWith('LeaveRequest', '1', 'SUBMITTED', '2', { status: 'draft' }, { status: 'submitted' });
    });

    it('should log audit on approve', async () => {
      mockLeaveRepo.findById.mockResolvedValue({ ...baseRequest, status: 'submitted' });
      mockEmployeeRepo.findById.mockResolvedValue({ id: '2', managerId: '1' });
      mockBalanceRepo.findByEmployeeIdAndLeaveTypeIdAndYear.mockResolvedValue({ id: 'b1', totalEntitlement: 10, usedDays: 0, pendingDays: 1 });
      mockLeaveRepo.updateStatus.mockResolvedValue({ ...baseRequest, status: 'approved' });
      
      await service.approveLeaveRequest('1', { id: '1', role: 'manager' }, 'Looks good');
      expect(mockAuditService.log).toHaveBeenCalledWith('LeaveRequest', '1', 'APPROVED', '1', { status: 'submitted' }, { status: 'approved' });
    });

    it('should log audit on reject', async () => {
      mockLeaveRepo.findById.mockResolvedValue({ ...baseRequest, status: 'submitted' });
      mockEmployeeRepo.findById.mockResolvedValue({ id: '2', managerId: '1' });
      mockBalanceRepo.findByEmployeeIdAndLeaveTypeIdAndYear.mockResolvedValue({ id: 'b1', totalEntitlement: 10, usedDays: 0, pendingDays: 1 });
      mockLeaveRepo.updateStatus.mockResolvedValue({ ...baseRequest, status: 'rejected' });
      
      await service.rejectLeaveRequest('1', { id: '1', role: 'manager' }, 'No');
      expect(mockAuditService.log).toHaveBeenCalledWith('LeaveRequest', '1', 'REJECTED', '1', { status: 'submitted' }, { status: 'rejected' });
    });

    it('should log audit on cancel', async () => {
      mockLeaveRepo.findById.mockResolvedValue({ ...baseRequest, status: 'submitted' });
      mockBalanceRepo.findByEmployeeIdAndLeaveTypeIdAndYear.mockResolvedValue({ id: 'b1', totalEntitlement: 10, usedDays: 0, pendingDays: 1 });
      mockLeaveRepo.updateStatus.mockResolvedValue({ ...baseRequest, status: 'cancelled' });
      
      await service.cancelLeaveRequest('1', { id: '2', role: 'employee' });
      expect(mockAuditService.log).toHaveBeenCalledWith('LeaveRequest', '1', 'CANCELLED', '2', { status: 'submitted' }, { status: 'cancelled' });
    });
  });
});
