import { createLeaveRequestSchema, updateLeaveRequestSchema } from 'modules/leave/leave.validation';

describe('createLeaveRequestSchema', () => {
  it('accepts a valid create leave request', () => {
    const input = {
      employeeId: 'emp-1',
      leaveTypeId: 'lt-1',
      startDate: '2025-07-01T00:00:00.000Z',
      endDate: '2025-07-05T00:00:00.000Z',
      reason: 'Vacation',
    };

    const result = createLeaveRequestSchema.safeParse(input);

    expect(result.success).toBe(true);
  });

  it('accepts a valid create leave request without optional reason', () => {
    const input = {
      employeeId: 'emp-1',
      leaveTypeId: 'lt-1',
      startDate: '2025-07-01T00:00:00.000Z',
      endDate: '2025-07-05T00:00:00.000Z',
    };

    const result = createLeaveRequestSchema.safeParse(input);

    expect(result.success).toBe(true);
  });

  it('rejects when employeeId is empty', () => {
    const input = {
      employeeId: '',
      leaveTypeId: 'lt-1',
      startDate: '2025-07-01T00:00:00.000Z',
      endDate: '2025-07-05T00:00:00.000Z',
    };

    const result = createLeaveRequestSchema.safeParse(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('employeeId'))).toBe(true);
    }
  });

  it('rejects when leaveTypeId is empty', () => {
    const input = {
      employeeId: 'emp-1',
      leaveTypeId: '',
      startDate: '2025-07-01T00:00:00.000Z',
      endDate: '2025-07-05T00:00:00.000Z',
    };

    const result = createLeaveRequestSchema.safeParse(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('leaveTypeId'))).toBe(true);
    }
  });

  it('rejects when startDate is not a valid ISO date string', () => {
    const input = {
      employeeId: 'emp-1',
      leaveTypeId: 'lt-1',
      startDate: 'not-a-date',
      endDate: '2025-07-05T00:00:00.000Z',
    };

    const result = createLeaveRequestSchema.safeParse(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('startDate'))).toBe(true);
    }
  });

  it('rejects when endDate is not a valid ISO date string', () => {
    const input = {
      employeeId: 'emp-1',
      leaveTypeId: 'lt-1',
      startDate: '2025-07-01T00:00:00.000Z',
      endDate: 'invalid-date',
    };

    const result = createLeaveRequestSchema.safeParse(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('endDate'))).toBe(true);
    }
  });

  it('rejects when startDate is after endDate', () => {
    const input = {
      employeeId: 'emp-1',
      leaveTypeId: 'lt-1',
      startDate: '2025-07-10T00:00:00.000Z',
      endDate: '2025-07-05T00:00:00.000Z',
    };

    const result = createLeaveRequestSchema.safeParse(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('startDate'))).toBe(true);
      expect(result.error.issues.some((i) => i.path.includes('endDate'))).toBe(true);
    }
  });

  it('rejects when startDate equals endDate', () => {
    const input = {
      employeeId: 'emp-1',
      leaveTypeId: 'lt-1',
      startDate: '2025-07-05T00:00:00.000Z',
      endDate: '2025-07-05T00:00:00.000Z',
    };

    const result = createLeaveRequestSchema.safeParse(input);

    expect(result.success).toBe(false);
  });

  it('rejects when required fields are missing', () => {
    const input = {
      employeeId: 'emp-1',
    };

    const result = createLeaveRequestSchema.safeParse(input);

    expect(result.success).toBe(false);
  });
});

describe('updateLeaveRequestSchema', () => {
  it('accepts a valid update with all fields', () => {
    const input = {
      startDate: '2025-08-01T00:00:00.000Z',
      endDate: '2025-08-05T00:00:00.000Z',
      reason: 'Updated reason',
    };

    const result = updateLeaveRequestSchema.safeParse(input);

    expect(result.success).toBe(true);
  });

  it('accepts a partial update with only reason', () => {
    const input = {
      reason: 'Updated reason',
    };

    const result = updateLeaveRequestSchema.safeParse(input);

    expect(result.success).toBe(true);
  });

  it('accepts a partial update with only startDate', () => {
    const input = {
      startDate: '2025-08-01T00:00:00.000Z',
    };

    const result = updateLeaveRequestSchema.safeParse(input);

    expect(result.success).toBe(true);
  });

  it('accepts a partial update with only endDate', () => {
    const input = {
      endDate: '2025-08-05T00:00:00.000Z',
    };

    const result = updateLeaveRequestSchema.safeParse(input);

    expect(result.success).toBe(true);
  });

  it('accepts an empty update object', () => {
    const input = {};

    const result = updateLeaveRequestSchema.safeParse(input);

    expect(result.success).toBe(true);
  });

  it('rejects when startDate is not a valid ISO date string', () => {
    const input = {
      startDate: 'not-a-date',
    };

    const result = updateLeaveRequestSchema.safeParse(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('startDate'))).toBe(true);
    }
  });

  it('rejects when endDate is not a valid ISO date string', () => {
    const input = {
      endDate: 'invalid-date',
    };

    const result = updateLeaveRequestSchema.safeParse(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('endDate'))).toBe(true);
    }
  });

  it('rejects when startDate is after endDate (both provided)', () => {
    const input = {
      startDate: '2025-08-10T00:00:00.000Z',
      endDate: '2025-08-05T00:00:00.000Z',
    };

    const result = updateLeaveRequestSchema.safeParse(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('startDate'))).toBe(true);
      expect(result.error.issues.some((i) => i.path.includes('endDate'))).toBe(true);
    }
  });

  it('rejects when startDate equals endDate (both provided)', () => {
    const input = {
      startDate: '2025-08-05T00:00:00.000Z',
      endDate: '2025-08-05T00:00:00.000Z',
    };

    const result = updateLeaveRequestSchema.safeParse(input);

    expect(result.success).toBe(false);
  });
});
