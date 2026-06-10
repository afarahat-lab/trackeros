import { describe, it, expect } from 'vitest';

// Importing the LeaveRequest interface to verify its existence
import { LeaveRequest } from '../../../src/modules/leave/leave.model';

describe('SC-1: LeaveRequest Model', () => {
  it('should exist and be defined', () => {
    expect(LeaveRequest).toBeDefined();
  });
});