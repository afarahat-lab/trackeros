import {
  EmployeeNotFoundError,
  RepositoryError,
  UniqueConstraintError,
} from '../../../../src/modules/employee/employee.errors';

describe('employee errors', () => {
  it('UniqueConstraintError carries the DUPLICATE_EMPLOYEE code', () => {
    const err = new UniqueConstraintError(
      'DUPLICATE_EMPLOYEE',
      "An employee with this 'email' already exists"
    );
    expect(err).toBeInstanceOf(RepositoryError);
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe('DUPLICATE_EMPLOYEE');
    expect(err.message).toContain('already exists');
  });

  it('EmployeeNotFoundError carries the EMPLOYEE_NOT_FOUND code', () => {
    const err = new EmployeeNotFoundError('emp-1');
    expect(err).toBeInstanceOf(RepositoryError);
    expect(err.code).toBe('EMPLOYEE_NOT_FOUND');
    expect(err.message).toContain('emp-1');
  });
});
