import {
  NotFoundError,
  ValidationError,
  ConflictError,
  UnauthorizedError,
} from '../../../src/shared/error-types';

describe('NotFoundError', () => {
  it('should be an instance of Error', () => {
    const err = new NotFoundError('Resource not found');
    expect(err).toBeInstanceOf(Error);
  });

  it('should have correct name and message', () => {
    const err = new NotFoundError('User 123 not found');
    expect(err.name).toBe('NotFoundError');
    expect(err.message).toBe('User 123 not found');
  });
});

describe('ValidationError', () => {
  it('should be an instance of Error', () => {
    const err = new ValidationError('Invalid input');
    expect(err).toBeInstanceOf(Error);
  });

  it('should have correct name and message', () => {
    const err = new ValidationError('Email is required');
    expect(err.name).toBe('ValidationError');
    expect(err.message).toBe('Email is required');
  });
});

describe('ConflictError', () => {
  it('should be an instance of Error', () => {
    const err = new ConflictError('Duplicate entry');
    expect(err).toBeInstanceOf(Error);
  });

  it('should have correct name and message', () => {
    const err = new ConflictError('Leave request already exists for these dates');
    expect(err.name).toBe('ConflictError');
    expect(err.message).toBe('Leave request already exists for these dates');
  });
});

describe('UnauthorizedError', () => {
  it('should be an instance of Error', () => {
    const err = new UnauthorizedError('Access denied');
    expect(err).toBeInstanceOf(Error);
  });

  it('should have correct name and message', () => {
    const err = new UnauthorizedError('Invalid token');
    expect(err.name).toBe('UnauthorizedError');
    expect(err.message).toBe('Invalid token');
  });
});
