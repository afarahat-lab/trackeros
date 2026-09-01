import {
  PolicyNotFoundError,
  RepositoryError,
  UniqueConstraintError,
} from '../../../../src/modules/policy/policy.errors';

describe('policy errors', () => {
  it('UniqueConstraintError carries the DUPLICATE_POLICY code', () => {
    const err = new UniqueConstraintError('A leave policy with these values already exists');
    expect(err).toBeInstanceOf(RepositoryError);
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe('DUPLICATE_POLICY');
    expect(err.message).toContain('already exists');
  });

  it('PolicyNotFoundError carries the POLICY_NOT_FOUND code', () => {
    const err = new PolicyNotFoundError('pol-1');
    expect(err).toBeInstanceOf(RepositoryError);
    expect(err.code).toBe('POLICY_NOT_FOUND');
    expect(err.message).toContain('pol-1');
  });
});
