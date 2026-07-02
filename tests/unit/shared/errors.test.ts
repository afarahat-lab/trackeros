import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from '../../../src/shared/errors';

describe('NotFoundError', () => {
  it('should create an error with entityName and id', () => {
    const error = new NotFoundError('Employee', '123');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.name).toBe('NotFoundError');
    expect(error.message).toBe("Employee with id '123' not found");
    expect(error.entityName).toBe('Employee');
    expect(error.id).toBe('123');
  });
});

describe('ValidationError', () => {
  it('should create an error with a message', () => {
    const error = new ValidationError('Invalid input');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.name).toBe('ValidationError');
    expect(error.message).toBe('Invalid input');
    expect(error.fieldErrors).toBeUndefined();
  });

  it('should create an error with fieldErrors map', () => {
    const fieldErrors = { email: ['Email is required'], age: ['Must be a number'] };
    const error = new ValidationError('Validation failed', fieldErrors);

    expect(error.message).toBe('Validation failed');
    expect(error.fieldErrors).toEqual(fieldErrors);
  });
});

describe('ConflictError', () => {
  it('should create an error with a message', () => {
    const error = new ConflictError('Resource already exists');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ConflictError);
    expect(error.name).toBe('ConflictError');
    expect(error.message).toBe('Resource already exists');
  });
});
