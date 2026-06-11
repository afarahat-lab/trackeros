import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as leaveModel from '../../../../src/modules/leave/leave.model';

describe('SC-1: leave.model exports', () => {
  beforeEach(() => {});
  afterEach(() => { vi.restoreAllMocks(); });

  it('exports LeaveType, LeaveRequestStatus, and LeaveRequest', () => {
    expect(leaveModel).toHaveProperty('LeaveType');
    expect(leaveModel).toHaveProperty('LeaveRequestStatus');
    expect(leaveModel).toHaveProperty('LeaveRequest');
  });

  it('contains required leave type values', () => {
    const leaveType = (leaveModel as Record<string, unknown>).LeaveType;
    expect(JSON.stringify(leaveType)).toContain('ANNUAL');
    expect(JSON.stringify(leaveType)).toContain('SICK');
    expect(JSON.stringify(leaveType)).toContain('EMERGENCY');
  });

  it('contains required request status values', () => {
    const status = (leaveModel as Record<string, unknown>).LeaveRequestStatus;
    expect(JSON.stringify(status)).toContain('PENDING');
    expect(JSON.stringify(status)).toContain('APPROVED');
    expect(JSON.stringify(status)).toContain('REJECTED');
  });
});