import {
  LeaveTypeCode,
  LeaveRequestStatus,
  UserRole
} from '../../../../src/shared/types/enums';

describe('shared-types enums', () => {
  describe('LeaveTypeCode', () => {
    it('exposes exactly the six canonical members with the canonical values', () => {
      expect(LeaveTypeCode).toEqual({
        ANNUAL: 'annual',
        SICK: 'sick',
        EMERGENCY: 'emergency',
        UNPAID: 'unpaid',
        MATERNITY: 'maternity',
        PATERNITY: 'paternity'
      });
    });

    it('has no additional members', () => {
      expect(Object.keys(LeaveTypeCode)).toHaveLength(6);
    });
  });

  describe('LeaveRequestStatus', () => {
    it('exposes exactly the five canonical uppercase members', () => {
      expect(LeaveRequestStatus).toEqual({
        DRAFT: 'DRAFT',
        SUBMITTED: 'SUBMITTED',
        APPROVED: 'APPROVED',
        REJECTED: 'REJECTED',
        CANCELLED: 'CANCELLED'
      });
    });

    it('has no additional members and no lowercase members', () => {
      expect(Object.keys(LeaveRequestStatus)).toHaveLength(5);
      expect(Object.values(LeaveRequestStatus)).toEqual(
        Object.values(LeaveRequestStatus).map((v) => v.toUpperCase())
      );
    });
  });

  describe('UserRole', () => {
    it('exposes exactly the three canonical members', () => {
      expect(UserRole).toEqual({
        EMPLOYEE: 'employee',
        MANAGER: 'manager',
        HR_ADMIN: 'hr_admin'
      });
    });

    it('has no additional members', () => {
      expect(Object.keys(UserRole)).toHaveLength(3);
    });
  });
});
