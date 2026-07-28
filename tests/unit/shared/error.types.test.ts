import {
  NotFoundError,
  ValidationError,
  ConflictError,
  ForbiddenError
} from '../../../src/shared/error.types';

describe('NotFoundError', () => {
  it('should create an error with the correct message', () => {
    const error = new NotFoundError('User', '123');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.message).toBe('User with id 123 not found');
    expect(error.name).toBe('NotFoundError');
  });
});

describe('ValidationError', () => {
  it('should create an error with message and optional details', () => {
    const error = new ValidationError('Invalid input', ['field1 is required']);
    expect(error.message).toBe('Invalid input');
    expect(error.details).toEqual(['field1 is required']);
    expect(error.name).toBe('ValidationError');
  });

  it('should work without details', () => {
    const error = new ValidationError('Invalid input');
    expect(error.details).toBeUndefined();
  });
});

describe('ConflictError', () => {
  it('should create an error with the correct message', () => {
    const error = new ConflictError('Resource already exists');
    expect(error.message).toBe('Resource already exists');
    expect(error.name).toBe('ConflictError');
  });
});

describe('ForbiddenError', () => {
  it('should create an error with the correct message', () => {
    const error = new ForbiddenError('Access denied');
    expect(error.message).toBe('Access denied');
    expect(error.name).toBe('ForbiddenError');
  });
});
