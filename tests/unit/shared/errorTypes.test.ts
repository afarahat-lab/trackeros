
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
} from '../../../src/shared/errorTypes';

describe('NotFoundError', () => {
  it('should instantiate with message, resourceName, and resourceId', () => {
    const error = new NotFoundError('User not found', 'User', '123');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.name).toBe('NotFoundError');
    expect(error.message).toBe('User not found');
    expect(error.resourceName).toBe('User');
    expect(error.resourceId).toBe('123');
  });

  it('should capture a stack trace', () => {
    const error = new NotFoundError('Not found', 'Item', 'abc');
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('NotFoundError');
  });
});

describe('ValidationError', () => {
  it('should instantiate with message and details array', () => {
    const error = new ValidationError('Invalid input', [
      'Name is required',
      'Email is invalid',
    ]);
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.name).toBe('ValidationError');
    expect(error.message).toBe('Invalid input');
    expect(error.details).toEqual(['Name is required', 'Email is invalid']);
  });

  it('should capture a stack trace', () => {
    const error = new ValidationError('Bad data', ['Field X missing']);
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('ValidationError');
  });
});

describe('ConflictError', () => {
  it('should instantiate with message and resourceName', () => {
    const error = new ConflictError('Duplicate entry', 'User');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ConflictError);
    expect(error.name).toBe('ConflictError');
    expect(error.message).toBe('Duplicate entry');
    expect(error.resourceName).toBe('User');
  });

  it('should capture a stack trace', () => {
    const error = new ConflictError('Already exists', 'Policy');
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('ConflictError');
  });
});

describe('UnauthorizedError', () => {
  it('should instantiate with a message', () => {
    const error = new UnauthorizedError('Invalid credentials');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(UnauthorizedError);
    expect(error.name).toBe('UnauthorizedError');
    expect(error.message).toBe('Invalid credentials');
  });

  it('should capture a stack trace', () => {
    const error = new UnauthorizedError('Token expired');
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('UnauthorizedError');
  });
});

describe('ForbiddenError', () => {
  it('should instantiate with a message', () => {
    const error = new ForbiddenError('Access denied');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ForbiddenError);
    expect(error.name).toBe('ForbiddenError');
    expect(error.message).toBe('Access denied');
  });

  it('should capture a stack trace', () => {
    const error = new ForbiddenError('Insufficient role');
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('ForbiddenError');
  });
});
