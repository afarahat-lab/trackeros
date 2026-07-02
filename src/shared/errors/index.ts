export class NotFoundError extends Error {
  public readonly entityName: string;
  public readonly id: string;

  constructor(entityName: string, id: string) {
    super(`${entityName} with id '${id}' not found`);
    this.name = 'NotFoundError';
    this.entityName = entityName;
    this.id = id;
  }
}

export class ValidationError extends Error {
  public readonly fieldErrors?: Record<string, string[]>;

  constructor(message: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = 'ValidationError';
    this.fieldErrors = fieldErrors;
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}
