import {
  LeaveStatus,
  UserRole,
  LEAVE_TYPES,
  LeaveTypeCode,
} from '../../../../src/shared/types';

describe('LeaveStatus', () => {
  it('should have all expected enum values', () => {
    expect(LeaveStatus.DRAFT).toBe('DRAFT');
    expect(LeaveStatus.SUBMITTED).toBe('SUBMITTED');
    expect(LeaveStatus.APPROVED).toBe('APPROVED');
    expect(LeaveStatus.REJECTED).toBe('REJECTED');
    expect(LeaveStatus.CANCELLED).toBe('CANCELLED');
  });

  it('should have exactly 5 members', () => {
    const keys = Object.keys(LeaveStatus).filter((k) => isNaN(Number(k)));
    expect(keys).toHaveLength(5);
  });
});

describe('UserRole', () => {
  it('should have all expected enum values', () => {
    expect(UserRole.EMPLOYEE).toBe('employee');
    expect(UserRole.MANAGER).toBe('manager');
    expect(UserRole.HR_ADMIN).toBe('hr_admin');
  });

  it('should have exactly 3 members', () => {
    const keys = Object.keys(UserRole).filter((k) => isNaN(Number(k)));
    expect(keys).toHaveLength(3);
  });
});

describe('LEAVE_TYPES', () => {
  const allCodes: LeaveTypeCode[] = [
    'annual',
    'sick',
    'emergency',
    'unpaid',
    'maternity',
    'paternity',
  ];

  it('should contain entries for all 6 LeaveTypeCode values', () => {
    for (const code of allCodes) {
      expect(LEAVE_TYPES[code]).toBeDefined();
    }
    expect(Object.keys(LEAVE_TYPES)).toHaveLength(6);
  });

  it('should have correct properties for annual leave', () => {
    const lt = LEAVE_TYPES.annual;
    expect(lt.code).toBe('annual');
    expect(lt.label).toBe('Annual Leave');
    expect(lt.requiresDocumentation).toBe(false);
    expect(lt.isPaid).toBe(true);
  });

  it('should have correct properties for sick leave', () => {
    const lt = LEAVE_TYPES.sick;
    expect(lt.code).toBe('sick');
    expect(lt.label).toBe('Sick Leave');
    expect(lt.requiresDocumentation).toBe(true);
    expect(lt.isPaid).toBe(true);
  });

  it('should have correct properties for emergency leave', () => {
    const lt = LEAVE_TYPES.emergency;
    expect(lt.code).toBe('emergency');
    expect(lt.label).toBe('Emergency Leave');
    expect(lt.requiresDocumentation).toBe(false);
    expect(lt.isPaid).toBe(true);
  });

  it('should have correct properties for unpaid leave', () => {
    const lt = LEAVE_TYPES.unpaid;
    expect(lt.code).toBe('unpaid');
    expect(lt.label).toBe('Unpaid Leave');
    expect(lt.requiresDocumentation).toBe(false);
    expect(lt.isPaid).toBe(false);
  });

  it('should have correct properties for maternity leave', () => {
    const lt = LEAVE_TYPES.maternity;
    expect(lt.code).toBe('maternity');
    expect(lt.label).toBe('Maternity Leave');
    expect(lt.requiresDocumentation).toBe(true);
    expect(lt.isPaid).toBe(true);
  });

  it('should have correct properties for paternity leave', () => {
    const lt = LEAVE_TYPES.paternity;
    expect(lt.code).toBe('paternity');
    expect(lt.label).toBe('Paternity Leave');
    expect(lt.requiresDocumentation).toBe(true);
    expect(lt.isPaid).toBe(true);
  });

  it('should have every entry with code matching its key', () => {
    for (const [key, value] of Object.entries(LEAVE_TYPES)) {
      expect(value.code).toBe(key);
    }
  });
});
