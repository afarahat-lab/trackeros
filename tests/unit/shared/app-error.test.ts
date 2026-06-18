import { AppError, ErrorCode } from '../../../src/shared/errors/app-error';

describe('AppError', () => {
  it('should create error with code and statusCode', () => {
    const error = new AppError('Not found', 'NOT_FOUND', 404);
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
    expect(error.message).toBe('Not found');
    expect(error.code).toBe('NOT_FOUND');
    expect(error.statusCode).toBe(404);
    expect(error.name).toBe('AppError');
  });

  it('should create error with details', () => {
    const details = { field: 'email', reason: 'invalid format' };
    const error = new AppError('Validation failed', 'VALIDATION_ERROR', 400, details);
    expect(error.details).toEqual(details);
  });

  it('should create error without details', () => {
    const error = new AppError('Internal error', 'INTERNAL_SERVER_ERROR', 500);
    expect(error.details).toBeUndefined();
  });

  it('should support all ErrorCode values', () => {
    const codes: ErrorCode[] = ['VALIDATION_ERROR', 'NOT_FOUND', 'UNAUTHORIZED', 'FORBIDDEN', 'CONFLICT', 'INTERNAL_SERVER_ERROR'];
    codes.forEach(code => {
      const error = new AppError('test', code, 400);
      expect(error.code).toBe(code);
    });
  });
});
