import { BalanceNotFoundError, InsufficientBalanceError } from '../../../../src/modules/balance/balance.errors';
import {
  RepositoryError,
  UniqueConstraintError,
} from '../../../../src/modules/employee/index';

describe('balance errors', () => {
  it('BalanceNotFoundError carries the BALANCE_NOT_FOUND code', () => {
    const err = new BalanceNotFoundError('Leave balance with id \'bal-1\' not found');
    expect(err).toBeInstanceOf(RepositoryError);
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe('BALANCE_NOT_FOUND');
    expect(err.message).toContain('bal-1');
  });

  it('InsufficientBalanceError carries the INSUFFICIENT_BALANCE code', () => {
    const err = new InsufficientBalanceError('emp-1', 'pol-1', 2026);
    expect(err).toBeInstanceOf(RepositoryError);
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe('INSUFFICIENT_BALANCE');
    expect(err.message).toContain('emp-1');
  });

  it('UniqueConstraintError carries the DUPLICATE_BALANCE code', () => {
    const err = new UniqueConstraintError(
      'DUPLICATE_BALANCE',
      'A leave balance already exists for this employee, policy and fiscal year'
    );
    expect(err).toBeInstanceOf(RepositoryError);
    expect(err.code).toBe('DUPLICATE_BALANCE');
  });
});
