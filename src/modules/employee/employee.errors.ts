export class RepositoryError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'RepositoryError';
    this.code = code;
  }
}

export class UniqueConstraintError extends RepositoryError {
  constructor(code: string, message: string) {
    super(code, message);
    this.name = 'UniqueConstraintError';
  }
}

export class EmployeeNotFoundError extends RepositoryError {
  constructor(id: string) {
    super('EMPLOYEE_NOT_FOUND', `Employee with id '${id}' not found`);
    this.name = 'EmployeeNotFoundError';
  }
}
