export interface FieldError {
  field: string;
  message: string;
}

export class NotFoundError extends Error {
  public readonly entityName: string;
  public readonly id: string | number;

  constructor(entityName: string, id: string | number) {
    super(`${entityName} with id ${id} not found`);
    this.name = 'NotFoundError';
    this.entityName = entityName;
    this.id = id;
  }
}

export class ValidationError extends Error {
  public readonly fieldErrors?: FieldError[];

  constructor(message: string, fieldErrors?: FieldError[]) {
    super(message);
    this.name = 'ValidationError';
    this.fieldErrors = fieldErrors;
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}
