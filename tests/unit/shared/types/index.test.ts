import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AppError, LeaveType, LeaveStatus, UserRole } from '../../../../src/shared/types/index';

describe('SC-4: src/shared/types/index.ts', () => {
  describe('AppError class', () => {
    it('should create an instance with message and statusCode', () => {
      const error = new AppError('Test error', 404);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('AppError');
    });
  });

  describe('Enums', () => {
    it('should have correct LeaveType values', () => {
      expect(LeaveType.Annual).toBe('annual');
      expect(LeaveType.Sick).toBe('sick');
      expect(LeaveType.Emergency).toBe('emergency');
    });

    it('should have correct LeaveStatus values', () => {
      expect(LeaveStatus.Pending).toBe('pending');
      expect(LeaveStatus.Approved).toBe('approved');
      expect(LeaveStatus.Rejected).toBe('rejected');
    });

    it('should have correct UserRole values', () => {
      expect(UserRole.Employee).toBe('employee');
      expect(UserRole.Manager).toBe('manager');
      expect(UserRole.HR).toBe('hr');
    });
  });
});
