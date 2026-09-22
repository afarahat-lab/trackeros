import { describe, expect, it } from 'vitest';
import { EmployeeRole, LeaveStatus } from '../../shared/types/index';
import { canApproveLeave, getAvailableLeaveActions } from './leave.actions';

describe('canApproveLeave', () => {
  it('permits a MANAGER and an ADMIN', () => {
    expect(canApproveLeave(EmployeeRole.MANAGER)).toBe(true);
    expect(canApproveLeave(EmployeeRole.ADMIN)).toBe(true);
  });

  it('denies an EMPLOYEE', () => {
    expect(canApproveLeave(EmployeeRole.EMPLOYEE)).toBe(false);
  });

  /**
   * The reason this rule has one home.
   *
   * The route guard used to carry its own copy written the other way round, as
   * `role === EMPLOYEE -> deny`. Across today's three roles that is the same answer. Add a
   * fourth and the two diverge in the dangerous direction: this rule denies it, the inverted
   * copy ADMITS it, and an unrecognised role reaches other employees' leave data.
   *
   * So the property under test is not "EMPLOYEE is denied" — it is "anything that is not an
   * approver is denied", which is what makes adding a role safe.
   */
  it('denies a role it does not recognise, rather than admitting it', () => {
    const futureRole = 'CONTRACTOR' as EmployeeRole;
    expect(canApproveLeave(futureRole)).toBe(false);
    expect(getAvailableLeaveActions(LeaveStatus.SUBMITTED, futureRole, false)).toEqual([]);
  });
});

describe('getAvailableLeaveActions', () => {
  it('offers approve and reject to an approver on a submitted request', () => {
    expect(getAvailableLeaveActions(LeaveStatus.SUBMITTED, EmployeeRole.MANAGER, false)).toEqual([
      'approve',
      'reject',
    ]);
  });

  it('offers an owner submit and cancel on a draft, and only cancel once submitted', () => {
    expect(getAvailableLeaveActions(LeaveStatus.DRAFT, EmployeeRole.EMPLOYEE, true)).toEqual([
      'submit',
      'cancel',
    ]);
    expect(getAvailableLeaveActions(LeaveStatus.SUBMITTED, EmployeeRole.EMPLOYEE, true)).toEqual([
      'cancel',
    ]);
  });

  it('offers an owner nothing on their OWN submitted request beyond cancelling', () => {
    // Separation of duties: a manager may not approve their own leave. The owner branch
    // returns first, so ownership beats role — that ordering is the rule, not an accident.
    expect(getAvailableLeaveActions(LeaveStatus.SUBMITTED, EmployeeRole.MANAGER, true)).toEqual([
      'cancel',
    ]);
  });
});
