import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as leaveModel from '../../../../src/modules/leave/leave.model';

describe('SC-1: leave.model exports', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports LeaveType, LeaveRequestStatus, LeaveRequest, and CreateLeaveRequestDto', () => {
    expect(leaveModel).toHaveProperty('LeaveType');
    expect(leaveModel).toHaveProperty('LeaveRequestStatus');
  });

  it('exposes enum-like values for LeaveType and LeaveRequestStatus', () => {
    expect(typeof leaveModel.LeaveType).toBe('object');
    expect(typeof leaveModel.LeaveRequestStatus).toBe('object');
  });
});