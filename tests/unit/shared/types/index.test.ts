import * as types from 'shared/types';

// Type guard for CreateLeaveRequestDto
function isCreateLeaveRequestDto(obj: unknown): obj is types.CreateLeaveRequestDto {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'employeeId' in obj &&
    'leavePolicyId' in obj &&
    'startDate' in obj &&
    'endDate' in obj &&
    'reason' in obj
  );
}

// Type guard for UpdateLeaveRequestDto
function isUpdateLeaveRequestDto(obj: unknown): obj is types.UpdateLeaveRequestDto {
  return (
    typeof obj === 'object' &&
    obj !== null
    // All fields are optional, so we only check that it's an object
  );
}

describe('Shared types', () => {
  describe('Enums', () => {
    it('LeaveType should have correct values', () => {
      expect(types.LeaveType.ANNUAL).toBe('annual');
      expect(types.LeaveType.SICK).toBe('sick');
      expect(types.LeaveType.EMERGENCY).toBe('emergency');
      expect(types.LeaveType.UNPAID).toBe('unpaid');
      expect(types.LeaveType.MATERNITY).toBe('maternity');
      expect(types.LeaveType.PATERNITY).toBe('paternity');
    });

    it('LeaveRequestStatus should have correct values', () => {
      expect(types.LeaveRequestStatus.DRAFT).toBe('DRAFT');
      expect(types.LeaveRequestStatus.SUBMITTED).toBe('SUBMITTED');
      expect(types.LeaveRequestStatus.APPROVED).toBe('APPROVED');
      expect(types.LeaveRequestStatus.REJECTED).toBe('REJECTED');
      expect(types.LeaveRequestStatus.CANCELLED).toBe('CANCELLED');
    });

    it('BalanceStatus should have correct values', () => {
      expect(types.BalanceStatus.ACTIVE).toBe('ACTIVE');
      expect(types.BalanceStatus.EXHAUSTED).toBe('EXHAUSTED');
      expect(types.BalanceStatus.FROZEN).toBe('FROZEN');
      expect(types.BalanceStatus.CLOSED).toBe('CLOSED');
    });

    it('LeavePolicyStatus should have correct values', () => {
      expect(types.LeavePolicyStatus.ACTIVE).toBe('ACTIVE');
      expect(types.LeavePolicyStatus.INACTIVE).toBe('INACTIVE');
    });

    it('EmploymentStatus should have correct values', () => {
      expect(types.EmploymentStatus.ACTIVE).toBe('ACTIVE');
      expect(types.EmploymentStatus.INACTIVE).toBe('INACTIVE');
      expect(types.EmploymentStatus.TERMINATED).toBe('TERMINATED');
    });
  });

  describe('DTOs', () => {
    it('CreateLeaveRequestDto should have correct shape', () => {
      const dto: unknown = {
        employeeId: 'emp-1',
        leavePolicyId: 'pol-1',
        startDate: '2025-01-01',
        endDate: '2025-01-10',
        reason: 'vacation',
      };

      expect(isCreateLeaveRequestDto(dto)).toBe(true);
      if (isCreateLeaveRequestDto(dto)) {
        expect(dto.employeeId).toBe('emp-1');
        expect(dto.leavePolicyId).toBe('pol-1');
        expect(dto.startDate).toBe('2025-01-01');
        expect(dto.endDate).toBe('2025-01-10');
        expect(dto.reason).toBe('vacation');
      }
    });

    it('UpdateLeaveRequestDto should have correct shape (all optional)', () => {
      const dto: unknown = {
        status: types.LeaveRequestStatus.APPROVED,
        approvedBy: 'mgr-1',
      };

      expect(isUpdateLeaveRequestDto(dto)).toBe(true);
      if (isUpdateLeaveRequestDto(dto)) {
        expect(dto.status).toBe(types.LeaveRequestStatus.APPROVED);
        expect(dto.approvedBy).toBe('mgr-1');
        expect(dto.reason).toBeUndefined();
      }
    });

    it('UpdateLeaveRequestDto can be empty object', () => {
      const dto: unknown = {};
      expect(isUpdateLeaveRequestDto(dto)).toBe(true);
    });
  });

  describe('Barrel exports', () => {
    it('should export exactly the expected symbols', () => {
      // Interfaces are erased at runtime, so they are not present in the module's exports.
      const expectedExports = [
        'LeaveType',
        'LeaveRequestStatus',
        'BalanceStatus',
        'LeavePolicyStatus',
        'EmploymentStatus',
      ];

      // Get all export keys (excluding default)
      const actualExports = Object.keys(types).filter(
        (key) => key !== '__esModule'
      );

      expect(actualExports.sort()).toEqual(expectedExports.sort());
    });
  });
});
