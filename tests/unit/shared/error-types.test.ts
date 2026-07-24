
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from '../../../src/shared/error-types';

describe('NotFoundError', () => {
  it('should extend Error', () => {
    const err = new NotFoundError('not found');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(NotFoundError);
  });

  it('should set name and message', () => {
    const err = new NotFoundError('resource missing');
    expect(err.name).toBe('NotFoundError');
    expect(err.message).toBe('resource missing');
  });

  it('should carry optional details', () => {
    const details = { id: 'abc' };
    const err = new NotFoundError('gone', details);
    expect(err.details).toBe(details);
  });

  it('should have undefined details when not provided', () => {
    const err = new NotFoundError('gone');
    expect(err.details).toBeUndefined();
  });
});

describe('ValidationError', () => {
  it('should extend Error', () => {
    const err = new ValidationError('invalid');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ValidationError);
  });

  it('should set name and message', () => {
    const err = new ValidationError('field required');
    expect(err.name).toBe('ValidationError');
    expect(err.message).toBe('field required');
  });

  it('should carry optional details', () => {
    const details = { field: 'email' };
    const err = new ValidationError('bad input', details);
    expect(err.details).toBe(details);
  });

  it('should have undefined details when not provided', () => {
    const err = new ValidationError('bad input');
    expect(err.details).toBeUndefined();
  });
});

describe('ConflictError', () => {
  it('should extend Error', () => {
    const err = new ConflictError('conflict');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ConflictError);
  });

  it('should set name and message', () => {
    const err = new ConflictError('duplicate');
    expect(err.name).toBe('ConflictError');
    expect(err.message).toBe('duplicate');
  });

  it('should carry optional details', () => {
    const details = { existingId: 'xyz' };
    const err = new ConflictError('duplicate', details);
    expect(err.details).toBe(details);
  });

  it('should have undefined details when not provided', () => {
    const err = new ConflictError('duplicate');
    expect(err.details).toBeUndefined();
  });
});
