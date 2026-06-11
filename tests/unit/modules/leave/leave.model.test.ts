import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('SC-1: leave.model exports and structure', () => {
  it('defines LeaveType values ANNUAL, SICK, and EMERGENCY', () => {
    const file = fs.readFileSync(path.resolve(process.cwd(), 'src/modules/leave/leave.model.ts'), 'utf8');
    expect(file).toContain('ANNUAL');
    expect(file).toContain('SICK');
    expect(file).toContain('EMERGENCY');
  });

  it('defines LeaveRequestStatus values PENDING, APPROVED, and REJECTED', () => {
    const file = fs.readFileSync(path.resolve(process.cwd(), 'src/modules/leave/leave.model.ts'), 'utf8');
    expect(file).toContain('PENDING');
    expect(file).toContain('APPROVED');
    expect(file).toContain('REJECTED');
  });

  it('defines LeaveRequest interface fields', () => {
    const file = fs.readFileSync(path.resolve(process.cwd(), 'src/modules/leave/leave.model.ts'), 'utf8');
    ['id','employeeId','leaveType','startDate','endDate','status','createdAt','updatedAt'].forEach((field) => {
      expect(file).toContain(field);
    });
  });
});