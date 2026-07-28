import {
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ConflictError,
} from '../../src/shared/errors';

describe('Shared error classes', () => {
  it('NotFoundError should have statusCode 404 and be an Error', () => {
    const error = new NotFoundError('test');
    expect(error).toBeInstanceOf(Error);
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('test');
    expect(error.name).toBe('NotFoundError');
  });

  it('ValidationError should have statusCode 400', () => {
    const error = new ValidationError('invalid');
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('invalid');
    expect(error.name).toBe('ValidationError');
  });

  it('UnauthorizedError should have statusCode 401', () => {
    const error = new UnauthorizedError('no access');
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('no access');
    expect(error.name).toBe('UnauthorizedError');
  });

  it('ConflictError should have statusCode 409', () => {
    const error = new ConflictError('duplicate');
    expect(error.statusCode).toBe(409);
    expect(error.message).toBe('duplicate');
    expect(error.name).toBe('ConflictError');
  });

  it('default messages are set', () => {
    expect(new NotFoundError().message).toBe('Resource not found');
    expect(new ValidationError().message).toBe('Validation failed');
    expect(new UnauthorizedError().message).toBe('Unauthorized');
    expect(new ConflictError().message).toBe('Conflict');
  });
});
