import {
  AppError,
  NotFoundError,
  ValidationError,
  ConflictError,
} from '../../../src/shared/errors';

describe('AppError', () => {
  it('should be an instance of Error', () => {
    class ConcreteError extends AppError {
      public readonly statusCode = 500;
      public readonly code = 'CONCRETE';
    }
    const error = new ConcreteError('test message');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
  });

  it('should set the message correctly', () => {
    class ConcreteError extends AppError {
      public readonly statusCode = 500;
      public readonly code = 'CONCRETE';
    }
    const error = new ConcreteError('something went wrong');
    expect(error.message).toBe('something went wrong');
  });

  it('should set the name to the concrete class name', () => {
    class ConcreteError extends AppError {
      public readonly statusCode = 500;
      public readonly code = 'CONCRETE';
    }
    const error = new ConcreteError('test');
    expect(error.name).toBe('ConcreteError');
  });

  it('should store optional details', () => {
    class ConcreteError extends AppError {
      public readonly statusCode = 500;
      public readonly code = 'CONCRETE';
    }
    const details = { field: 'email', reason: 'invalid format' };
    const error = new ConcreteError('test', details);
    expect(error.details).toEqual(details);
  });

  it('should have undefined details when not provided', () => {
    class ConcreteError extends AppError {
      public readonly statusCode = 500;
      public readonly code = 'CONCRETE';
    }
    const error = new ConcreteError('test');
    expect(error.details).toBeUndefined();
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

  it('should have a default message', () => {
    const error = new NotFoundError();
    expect(error.message).toBe('Resource not found');
  });

  it('should accept a custom message', () => {
    const error = new NotFoundError('User not found');
    expect(error.message).toBe('User not found');
  });

  it('should accept details', () => {
    const error = new NotFoundError('User not found', { id: '123' });
    expect(error.details).toEqual({ id: '123' });
  });

  it('should be an instance of AppError', () => {
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

  it('should have a default message', () => {
    const error = new ValidationError();
    expect(error.message).toBe('Validation failed');
  });

  it('should accept a custom message', () => {
    const error = new ValidationError('Invalid email format');
    expect(error.message).toBe('Invalid email format');
  });

  it('should accept details', () => {
    const error = new ValidationError('Invalid input', { fields: ['email', 'name'] });
    expect(error.details).toEqual({ fields: ['email', 'name'] });
  });

  it('should be an instance of AppError', () => {
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

  it('should have a default message', () => {
    const error = new ConflictError();
    expect(error.message).toBe('Resource conflict');
  });

  it('should accept a custom message', () => {
    const error = new ConflictError('Leave request already exists');
    expect(error.message).toBe('Leave request already exists');
  });

  it('should accept details', () => {
    const error = new ConflictError('Duplicate entry', { existingId: '456' });
    expect(error.details).toEqual({ existingId: '456' });
  });

  it('should be an instance of AppError', () => {
    const error = new ConflictError();
    expect(error).toBeInstanceOf(AppError);
  });
});
