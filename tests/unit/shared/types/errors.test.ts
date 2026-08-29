import {
  NotFoundError,
  ValidationError,
  InsufficientBalanceError,
  OverlapError
} from '../../../../src/shared/types/errors';

describe('shared-types error types', () => {
  it.each([
    [NotFoundError, 'NOT_FOUND', 404],
    [ValidationError, 'VALIDATION_ERROR', 400],
    [InsufficientBalanceError, 'INSUFFICIENT_BALANCE', 422],
    [OverlapError, 'POLICY_VIOLATION', 422]
  ])(
    '%p is constructible, throwable and carries the error contract',
    (Ctor, code, statusCode) => {
      const err = new Ctor('boom');

      expect(err).toBeInstanceOf(Error);
      expect(() => {
        throw err;
      }).toThrow(err);

      expect(err.code).toBe(code);
      expect(err.statusCode).toBe(statusCode);
      expect(err.toResponse()).toEqual({ error: 'boom', code });
    }
  );
});
