import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from '../../../src/shared/errors';

describe('AppError and subclasses', () => {
  it('exposes message, statusCode, and code on the base class', () => {
    const err = new AppError('boom', 418, 'TEAPOT');
    expect(err.message).toBe('boom');
    expect(err.statusCode).toBe(418);
    expect(err.code).toBe('TEAPOT');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });

  it('fixes the correct status code and distinct code per subclass', () => {
    expect(new ValidationError().statusCode).toBe(400);
    expect(new ValidationError().code).toBe('VALIDATION_ERROR');

    expect(new UnauthorizedError().statusCode).toBe(401);
    expect(new UnauthorizedError().code).toBe('UNAUTHORIZED');

    expect(new ForbiddenError().statusCode).toBe(403);
    expect(new ForbiddenError().code).toBe('FORBIDDEN');

    expect(new NotFoundError().statusCode).toBe(404);
    expect(new NotFoundError().code).toBe('NOT_FOUND');

    expect(new ConflictError().statusCode).toBe(409);
    expect(new ConflictError().code).toBe('CONFLICT');
  });

  it('preserves the class name per subclass', () => {
    expect(new ValidationError().name).toBe('ValidationError');
    expect(new ConflictError().name).toBe('ConflictError');
  });

  it('every subclass is instanceof AppError', () => {
    const errors: AppError[] = [
      new ValidationError(),
      new UnauthorizedError(),
      new ForbiddenError(),
      new NotFoundError(),
      new ConflictError(),
    ];
    for (const err of errors) {
      expect(err).toBeInstanceOf(AppError);
    }
  });

  it('accepts a custom message', () => {
    expect(new NotFoundError('missing id 7').message).toBe('missing id 7');
  });
});
