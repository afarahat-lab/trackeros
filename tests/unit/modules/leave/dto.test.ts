import { CreateLeaveRequestDto, SubmitLeaveRequestDto, ReviewLeaveRequestDto, CancelLeaveRequestDto, LeaveRequestQueryDto } from '../../../../src/modules/leave/leave.dto';

describe('Leave DTOs', () => {
  describe('CreateLeaveRequestDto', () => {
    it('should accept valid required fields', () => {
      const dto: CreateLeaveRequestDto = {
        employeeId: 'emp-001',
        policyId: 'pol-001',
        startDate: '2026-07-01',
        endDate: '2026-07-05',
      };
      expect(dto.employeeId).toBe('emp-001');
      expect(dto.policyId).toBe('pol-001');
      expect(dto.startDate).toBe('2026-07-01');
      expect(dto.endDate).toBe('2026-07-05');
      expect(dto.reason).toBeUndefined();
    });

    it('should accept optional reason field', () => {
      const dto: CreateLeaveRequestDto = {
        employeeId: 'emp-001',
        policyId: 'pol-001',
        startDate: '2026-07-01',
        endDate: '2026-07-05',
        reason: 'Vacation',
      };
      expect(dto.reason).toBe('Vacation');
    });
  });

  describe('SubmitLeaveRequestDto', () => {
    it('should accept required fields', () => {
      const dto: SubmitLeaveRequestDto = {
        requestId: 'req-001',
        employeeId: 'emp-001',
      };
      expect(dto.requestId).toBe('req-001');
      expect(dto.employeeId).toBe('emp-001');
    });
  });

  describe('ReviewLeaveRequestDto', () => {
    it('should accept required fields without reviewNotes', () => {
      const dto: ReviewLeaveRequestDto = {
        requestId: 'req-001',
        managerId: 'mgr-001',
      };
      expect(dto.requestId).toBe('req-001');
      expect(dto.managerId).toBe('mgr-001');
      expect(dto.reviewNotes).toBeUndefined();
    });

    it('should accept optional reviewNotes', () => {
      const dto: ReviewLeaveRequestDto = {
        requestId: 'req-001',
        managerId: 'mgr-001',
        reviewNotes: 'Approved',
      };
      expect(dto.reviewNotes).toBe('Approved');
    });
  });

  describe('CancelLeaveRequestDto', () => {
    it('should accept required fields', () => {
      const dto: CancelLeaveRequestDto = {
        requestId: 'req-001',
        employeeId: 'emp-001',
      };
      expect(dto.requestId).toBe('req-001');
      expect(dto.employeeId).toBe('emp-001');
    });
  });

  describe('LeaveRequestQueryDto', () => {
    it('should accept all optional fields', () => {
      const dto: LeaveRequestQueryDto = {};
      expect(dto.employeeId).toBeUndefined();
      expect(dto.managerId).toBeUndefined();
      expect(dto.status).toBeUndefined();
      expect(dto.fiscalYear).toBeUndefined();
    });

    it('should accept partial fields', () => {
      const dto: LeaveRequestQueryDto = {
        employeeId: 'emp-001',
        status: 'pending_approval',
      };
      expect(dto.employeeId).toBe('emp-001');
      expect(dto.status).toBe('pending_approval');
    });
  });
});
