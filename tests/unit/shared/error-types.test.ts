import {
  AppError,
  NotFoundError,
  ValidationError,
  ConflictError,
  UnauthorizedError,
} from '../../../src/shared/error-types';

describe('AppError', () => {
  it('should be an instance of Error', () => {
    class ConcreteAppError extends AppError {
      public readonly statusCode = 500;
      public readonly code = 'INTERNAL';
    }
    const error = new ConcreteAppError('Something went wrong');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
  });

  it('should set the message correctly', () => {
    class ConcreteAppError extends AppError {
      public readonly statusCode = 500;
      public readonly code = 'INTERNAL';
    }
    const error = new ConcreteAppError('test message');
    expect(error.message).toBe('test message');
  });

  it('should set the name to the class name', () => {
    class ConcreteAppError extends AppError {
      public readonly statusCode = 500;
      public readonly code = 'INTERNAL';
    }
    const error = new ConcreteAppError('test');
    expect(error.name).toBe('ConcreteAppError');
  });
});

describe('NotFoundError', () => {
  it('should have statusCode 404', () => {
    const error = new NotFoundError();
    expect(error.statusCode).toBe(404);
  });

  it('should have code NOT_FOUND', () => {
    const error = new NotFoundError();
    expect(error.code).toBe('NOT_FOUND');
  });

  it('should have default message', () => {
    const error = new NotFoundError();
    expect(error.message).toBe('Resource not found');
  });

  it('should accept custom message', () => {
    const error = new NotFoundError('User not found');
    expect(error.message).toBe('User not found');
  });

  it('should be instance of AppError', () => {
    const error = new NotFoundError();
    expect(error).toBeInstanceOf(AppError);
  });
});

describe('ValidationError', () => {
  it('should have statusCode 400', () => {
    const error = new ValidationError();
    expect(error.statusCode).toBe(400);
  });

  it('should have code VALIDATION_ERROR', () => {
    const error = new ValidationError();
    expect(error.code).toBe('VALIDATION_ERROR');
  });

  it('should have default message', () => {
    const error = new ValidationError();
    expect(error.message).toBe('Validation failed');
  });

  it('should accept custom message', () => {
    const error = new ValidationError('Invalid input');
    expect(error.message).toBe('Invalid input');
  });

  it('should have empty details array by default', () => {
    const error = new ValidationError();
    expect(error.details).toEqual([]);
  });

  it('should accept details array', () => {
    const details = [{ field: 'name', message: 'Required' }];
    const error = new ValidationError('Invalid', details);
    expect(error.details).toBe(details);
  });

  it('should be instance of AppError', () => {
    const error = new ValidationError();
    expect(error).toBeInstanceOf(AppError);
  });
});

describe('ConflictError', () => {
  it('should have statusCode 409', () => {
    const error = new ConflictError();
    expect(error.statusCode).toBe(409);
  });

  it('should have code CONFLICT', () => {
    const error = new ConflictError();
    expect(error.code).toBe('CONFLICT');
  });

  it('should have default message', () => {
    const error = new ConflictError();
    expect(error.message).toBe('Resource conflict');
  });

  it('should accept custom message', () => {
    const error = new ConflictError('Duplicate entry');
    expect(error.message).toBe('Duplicate entry');
  });

  it('should be instance of AppError', () => {
    const error = new ConflictError();
    expect(error).toBeInstanceOf(AppError);
  });
});

describe('UnauthorizedError', () => {
  it('should have statusCode 401', () => {
    const error = new UnauthorizedError();
    expect(error.statusCode).toBe(401);
  });

  it('should have code UNAUTHORIZED', () => {
    const error = new UnauthorizedError();
    expect(error.code).toBe('UNAUTHORIZED');
  });

  it('should have default message', () => {
    const error = new UnauthorizedError();
    expect(error.message).toBe('Unauthorized');
  });

  it('should accept custom message', () => {
    const error = new UnauthorizedError('Invalid token');
    expect(error.message).toBe('Invalid token');
  });

  it('should be instance of AppError', () => {
    const error = new UnauthorizedError();
    expect(error).toBeInstanceOf(AppError);
  });
});
