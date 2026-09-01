export class RepositoryError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'RepositoryError';
    this.code = code;
  }
}

export class UniqueConstraintError extends RepositoryError {
  constructor(message: string) {
    super('DUPLICATE_POLICY', message);
    this.name = 'UniqueConstraintError';
  }
}

export class PolicyNotFoundError extends RepositoryError {
  constructor(id: string) {
    super('POLICY_NOT_FOUND', `Leave policy with id '${id}' not found`);
    this.name = 'PolicyNotFoundError';
  }
}
