import { describe, it, expect, vi } from 'vitest';
import { leaveRequestSchema } from '../routes/leave-request-routes';

vi.mock('zod');

describe('SC-6: Request Body Validation', () => {
  it('should validate request body with Zod schema', () => {
    const validData = {
      employeeId: '123',
      startDate: '2023-01-01',
      endDate: '2023-01-10',
      reason: 'Vacation',
      status: 'pending'
    };
    expect(() => leaveRequestSchema.parse(validData)).not.toThrow();
  });

  it('should throw an error for invalid request body', () => {
    const invalidData = {
      employeeId: '',
      startDate: '',
      endDate: '',
      reason: '',
      status: 'invalid'
    };
    expect(() => leaveRequestSchema.parse(invalidData)).toThrow();
  });
});