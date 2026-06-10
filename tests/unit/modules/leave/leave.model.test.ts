import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('SC-1: leave.model exports', () => {
  it('exports LeaveType, LeaveRequestStatus, and LeaveRequest-related model members', async () => {
    const mod = await import('../../../../src/modules/leave/leave.model');

    expect(mod).toBeDefined();
    expect(Object.keys(mod).length).toBeGreaterThan(0);
    expect('LeaveType' in mod).toBe(true);
    expect('LeaveRequestStatus' in mod).toBe(true);
  });

  it('contains the canonical LeaveRequest field names in source', async () => {
    const fs = await import('node:fs');
    const source = fs.readFileSync('src/modules/leave/leave.model.ts', 'utf8');

    ['id','employeeId','leaveType','startDate','endDate','status','approverEmployeeId','createdAt'].forEach((field) => {
      expect(source).toContain(field);
    });
  });

  it('fails fast if model file is missing', async () => {
    const fs = await import('node:fs');
    expect(fs.existsSync('src/modules/leave/leave.model.ts')).toBe(true);
  });
});