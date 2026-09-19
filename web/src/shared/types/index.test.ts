import { describe, it, expect } from 'vitest';
import {
  EmployeeRole,
  LeaveTypeCode,
  LeaveStatus,
  EmploymentStatus,
  AuthSessionStatus,
} from './index';

describe('enum member sets', () => {
  it('EmployeeRole has exactly the expected members', () => {
    const values = Object.values(EmployeeRole).sort();
    expect(values).toEqual(['ADMIN', 'EMPLOYEE', 'MANAGER']);
  });

  it('LeaveTypeCode has exactly the expected members', () => {
    const values = Object.values(LeaveTypeCode).sort();
    expect(values).toEqual([
      'annual',
      'emergency',
      'maternity',
      'paternity',
      'sick',
      'unpaid',
    ]);
  });

  it('LeaveStatus has exactly the expected members', () => {
    const values = Object.values(LeaveStatus).sort();
    expect(values).toEqual([
      'APPROVED',
      'CANCELLED',
      'DRAFT',
      'REJECTED',
      'SUBMITTED',
    ]);
  });

  it('EmploymentStatus has exactly the expected members', () => {
    const values = Object.values(EmploymentStatus).sort();
    expect(values).toEqual(['ACTIVE', 'ON_LEAVE', 'TERMINATED']);
  });

  it('AuthSessionStatus has exactly the expected members', () => {
    const values = Object.values(AuthSessionStatus).sort();
    expect(values).toEqual(['ANONYMOUS', 'AUTHENTICATED', 'EXPIRED']);
  });
});
