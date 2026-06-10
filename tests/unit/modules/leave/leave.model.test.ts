import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as leaveModel from '../../../../src/modules/leave/leave.model';

describe('SC-1: leave.model exports', () => {
  beforeEach(() => {});
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports LeaveType, LeaveRequestStatus, LeaveRequest, and CreateLeaveRequestDto symbols', () => {
    expect(leaveModel).toHaveProperty('LeaveType');
    expect(leaveModel).toHaveProperty('LeaveRequestStatus');
  });

  it('does not expose undefined model exports', () => {
    expect((leaveModel as Record<string, unknown>).LeaveType).not.toBeUndefined();
    expect((leaveModel as Record<string, unknown>).LeaveRequestStatus).not.toBeUndefined();
  });
});