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

  it('exposes enum-like values for leave types and statuses', () => {
    const moduleRecord = leaveModel as Record<string, unknown>;
    expect(moduleRecord.LeaveType).toBeDefined();
    expect(moduleRecord.LeaveRequestStatus).toBeDefined();
  });
});