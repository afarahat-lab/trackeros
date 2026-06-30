import { describe, it, expect } from 'vitest';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  ConflictError,
} from '../../../src/shared/error.types';

describe('NotFoundError', () => {
  it('should set message, name, entityName, and id correctly', () => {
    const error = new NotFoundError('LeaveRequest', 123);

    expect(error.message).toBe('LeaveRequest with id 123 not found');
    expect(error.name).toBe('NotFoundError');
    expect(error.entityName).toBe('LeaveRequest');
    expect(error.id).toBe(123);
  });
});

describe('ValidationError', () => {
  it('should set message and name correctly', () => {
    const error = new ValidationError('Invalid input');

    expect(error.message).toBe('Invalid input');
    expect(error.name).toBe('ValidationError');
  });

  it('should store fieldErrors when provided', () => {
    const fieldErrors = [{ field: 'startDate', message: 'Start date is required' }];
    const error = new ValidationError('Invalid input', fieldErrors);

    expect(error.fieldErrors).toEqual(fieldErrors);
  });
});

describe('ForbiddenError', () => {
  it('should set message and name correctly', () => {
    const error = new ForbiddenError('Access denied');

    expect(error.message).toBe('Access denied');
    expect(error.name).toBe('ForbiddenError');
  });
});

describe('ConflictError', () => {
  it('should set message and name correctly', () => {
    const error = new ConflictError('Resource already exists');

    expect(error.message).toBe('Resource already exists');
    expect(error.name).toBe('ConflictError');
  });
});
