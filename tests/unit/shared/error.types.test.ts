import {
  NotFoundError,
  ValidationError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
} from '../../../src/shared/error.types';

describe('NotFoundError', () => {
  it('should instantiate with entityName and id properties', () => {
    const error = new NotFoundError('Employee', 'emp-123');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.name).toBe('NotFoundError');
    expect(error.message).toBe('Employee with id emp-123 not found');
    expect(error.entityName).toBe('Employee');
    expect(error.id).toBe('emp-123');
  });
});

describe('ValidationError', () => {
  it('should instantiate with message and details properties', () => {
    const details = ['Field is required', 'Invalid date range'];
    const error = new ValidationError('Validation failed', details);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.name).toBe('ValidationError');
    expect(error.message).toBe('Validation failed');
    expect(error.details).toEqual(details);
  });

  it('should instantiate without details', () => {
    const error = new ValidationError('Validation failed');

    expect(error.details).toBeUndefined();
  });
});

describe('ConflictError', () => {
  it('should instantiate with message property', () => {
    const error = new ConflictError('Resource already exists');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ConflictError);
    expect(error.name).toBe('ConflictError');
    expect(error.message).toBe('Resource already exists');
  });
});

describe('UnauthorizedError', () => {
  it('should instantiate with message property', () => {
    const error = new UnauthorizedError('Authentication required');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(UnauthorizedError);
    expect(error.name).toBe('UnauthorizedError');
    expect(error.message).toBe('Authentication required');
  });
});

describe('ForbiddenError', () => {
  it('should instantiate with message property', () => {
    const error = new ForbiddenError('Insufficient permissions');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ForbiddenError);
    expect(error.name).toBe('ForbiddenError');
    expect(error.message).toBe('Insufficient permissions');
  });
});
