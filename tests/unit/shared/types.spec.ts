import { LeaveType, LeaveRequestStatus, BalanceStatus } from '../../../src/shared/types';

describe('LeaveType', () => {
  it('should have exactly three members', () => {
    const values = Object.values(LeaveType);
    expect(values).toHaveLength(3);
  });

  it.each([
    ['ANNUAL', LeaveType.ANNUAL],
    ['SICK', LeaveType.SICK],
    ['EMERGENCY', LeaveType.EMERGENCY],
  ])('should contain %s', (_name, value) => {
    expect(Object.values(LeaveType)).toContain(value);
  });
});

describe('LeaveRequestStatus', () => {
  it('should have exactly six members', () => {
    const values = Object.values(LeaveRequestStatus);
    expect(values).toHaveLength(6);
  });

  it.each([
    ['DRAFT', LeaveRequestStatus.DRAFT],
    ['SUBMITTED', LeaveRequestStatus.SUBMITTED],
    ['APPROVED', LeaveRequestStatus.APPROVED],
    ['REJECTED', LeaveRequestStatus.REJECTED],
    ['CANCELLED', LeaveRequestStatus.CANCELLED],
    ['REVOKED', LeaveRequestStatus.REVOKED],
  ])('should contain %s', (_name, value) => {
    expect(Object.values(LeaveRequestStatus)).toContain(value);
  });
});

describe('BalanceStatus', () => {
  it('should have exactly three members', () => {
    const values = Object.values(BalanceStatus);
    expect(values).toHaveLength(3);
  });

  it.each([
    ['ACTIVE', BalanceStatus.ACTIVE],
    ['EXHAUSTED', BalanceStatus.EXHAUSTED],
    ['FROZEN', BalanceStatus.FROZEN],
  ])('should contain %s', (_name, value) => {
    expect(Object.values(BalanceStatus)).toContain(value);
  });
});
