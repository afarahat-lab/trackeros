import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('SC-1: leave.model exports and shape', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports LeaveType, LeaveRequestStatus, and LeaveRequest', async () => {
    const mod = await import('../../../../src/modules/leave/leave.model');

    expect(mod).toHaveProperty('LeaveType');
    expect(mod).toHaveProperty('LeaveRequestStatus');
  });

  it('defines LeaveRequest fields in source', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');

    const filePath = path.resolve(process.cwd(), 'src/modules/leave/leave.model.ts');
    expect(fs.existsSync(filePath)).toBe(true);

    const content = fs.readFileSync(filePath, 'utf8');

    const requiredFields = [
      'id',
      'employeeId',
      'leaveType',
      'startDate',
      'endDate',
      'status',
      'approverEmployeeId',
      'createdAt',
    ];

    for (const field of requiredFields) {
      expect(content).toContain(field);
    }
  });

  it('fails when model file is missing', async () => {
    const fs = await import('node:fs');
    expect(fs.existsSync('src/modules/leave/leave.model.ts')).toBe(true);
  });
});