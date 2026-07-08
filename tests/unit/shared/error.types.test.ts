
import { NotFoundError, ValidationError, ConflictError } from '../../../src/shared/error.types';

describe('NotFoundError', () => {
  it('should extend Error', () => {
    const error = new NotFoundError('Resource not found');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(NotFoundError);
  });

  it('should have correct name and message', () => {
    const error = new NotFoundError('User 123 not found');
    expect(error.name).toBe('NotFoundError');
    expect(error.message).toBe('User 123 not found');
  });

  it('should not be instance of other error types', () => {
    const error = new NotFoundError('test');
    expect(error).not.toBeInstanceOf(ValidationError);
    expect(error).not.toBeInstanceOf(ConflictError);
  });
});

describe('ValidationError', () => {
  it('should extend Error', () => {
    const error = new ValidationError('Invalid input');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ValidationError);
  });

  it('should have correct name and message', () => {
    const error = new ValidationError('Email is required');
    expect(error.name).toBe('ValidationError');
    expect(error.message).toBe('Email is required');
  });

  it('should not be instance of other error types', () => {
    const error = new ValidationError('test');
    expect(error).not.toBeInstanceOf(NotFoundError);
    expect(error).not.toBeInstanceOf(ConflictError);
  });
});

describe('ConflictError', () => {
  it('should extend Error', () => {
    const error = new ConflictError('Resource already exists');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ConflictError);
  });

  it('should have correct name and message', () => {
    const error = new ConflictError('Duplicate leave request');
    expect(error.name).toBe('ConflictError');
    expect(error.message).toBe('Duplicate leave request');
  });

  it('should not be instance of other error types', () => {
    const error = new ConflictError('test');
    expect(error).not.toBeInstanceOf(NotFoundError);
    expect(error).not.toBeInstanceOf(ValidationError);
  });
});
