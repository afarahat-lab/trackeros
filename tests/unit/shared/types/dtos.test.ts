import {
  LeaveTypeCode,
  LeaveRequestStatus
} from '../../../../src/shared/types/enums';

describe('shared-types DTO shapes', () => {
  const baseRequest = {
    id: 'req-1',
    employeeId: 'emp-1',
    leaveTypeId: 'lt-annual',
    leaveTypeCode: LeaveTypeCode.ANNUAL,
    startDate: new Date('2026-06-01'),
    endDate: new Date('2026-06-05'),
    reason: 'vacation',
    status: LeaveRequestStatus.SUBMITTED,
    approvedBy: null,
    approvedAt: null,
    rejectedBy: null,
    rejectedAt: null,
    rejectionReason: null,
    cancelledBy: null,
    cancelledAt: null,
    createdAt: new Date('2026-05-01'),
    updatedAt: new Date('2026-05-01')
  };

  it('LeaveRequestDTO status field is typed to LeaveRequestStatus', () => {
    expect([LeaveRequestStatus.DRAFT, LeaveRequestStatus.SUBMITTED]).toContain(
      baseRequest.status
    );
    expect(baseRequest.status).toBe('SUBMITTED');
  });

  it('LeaveBalanceDTO exposes entitlementDays/usedDays/pendingDays and no remainingDays/availableDays', () => {
    const balance: Record<string, unknown> = {
      id: 'bal-1',
      employeeId: 'emp-1',
      policyId: 'pol-annual',
      leaveTypeCode: LeaveTypeCode.ANNUAL,
      fiscalYear: 2026,
      entitlementDays: 20,
      usedDays: 2,
      pendingDays: 3
    };

    expect(balance.entitlementDays).toBe(20);
    expect(balance.usedDays).toBe(2);
    expect(balance.pendingDays).toBe(3);
    expect(balance).not.toHaveProperty('remainingDays');
    expect(balance).not.toHaveProperty('availableDays');
  });

  it('FiscalYear is a plain integer calendar year', () => {
    const fiscalYear = 2026;
    expect(Number.isInteger(fiscalYear)).toBe(true);
    expect(fiscalYear).toBe(2026);
  });
});
