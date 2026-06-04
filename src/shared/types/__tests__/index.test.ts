import { describe, it, expect } from 'vitest';
import { AppError, LeaveType, LeaveStatus, UserRole } from '../index';

describe('SC-4: src/shared/types/index.ts', () => {
  it('should contain the AppError class', () => {
    const error = new AppError('Test error', 400);
    expect(error).toBeInstanceOf(AppError);
    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(400);
  });

  it('should contain enums for LeaveType, LeaveStatus, and UserRole', () => {
    expect(LeaveType.Annual).toBe('annual');
    expect(LeaveStatus.Pending).toBe('pending');
    expect(UserRole.Employee).toBe('employee');
  });
});
