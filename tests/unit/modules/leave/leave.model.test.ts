import { LeaveRequestStatus, LeaveRequest, CreateLeaveRequestDto, UpdateLeaveRequestDto } from '../../../../src/modules/leave/leave.model';

describe('Leave model types', () => {
  describe('LeaveRequestStatus', () => {
    it('should accept valid status values', () => {
      const statuses: LeaveRequestStatus[] = ['pending', 'approved', 'rejected', 'cancelled'];
      expect(statuses).toHaveLength(4);
    });
  });

  describe('LeaveRequest', () => {
    it('should have all required fields', () => {
      const request: LeaveRequest = {
        id: '1',
        employeeId: 'emp1',
        policyId: 'pol1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-05'),
        totalDays: 5,
        status: 'pending',
        reason: 'Vacation',
        managerId: 'mgr1',
        managerNotes: null,
        reviewedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      expect(request.id).toBe('1');
      expect(request.employeeId).toBe('emp1');
      expect(request.policyId).toBe('pol1');
      expect(request.status).toBe('pending');
      expect(request.totalDays).toBe(5);
    });
  });

  describe('CreateLeaveRequestDto', () => {
    it('should have required fields', () => {
      const dto: CreateLeaveRequestDto = {
        employeeId: 'emp1',
        policyId: 'pol1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-05'),
        reason: 'Vacation',
      };

      expect(dto.employeeId).toBe('emp1');
      expect(dto.policyId).toBe('pol1');
      expect(dto.reason).toBe('Vacation');
    });

    it('should allow null reason', () => {
      const dto: CreateLeaveRequestDto = {
        employeeId: 'emp1',
        policyId: 'pol1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-05'),
        reason: null,
      };

      expect(dto.reason).toBeNull();
    });
  });

  describe('UpdateLeaveRequestDto', () => {
    it('should allow partial updates', () => {
      const dto: UpdateLeaveRequestDto = {
        status: 'approved',
        managerNotes: 'Approved',
      };

      expect(dto.status).toBe('approved');
      expect(dto.managerNotes).toBe('Approved');
    });

    it('should allow empty object', () => {
      const dto: UpdateLeaveRequestDto = {};
      expect(dto).toBeDefined();
    });
  });
});
