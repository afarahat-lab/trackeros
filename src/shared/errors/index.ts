export abstract class AppError extends Error {
  public abstract readonly statusCode: number;
  public abstract readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  public readonly statusCode = 404;
  public readonly code = 'NOT_FOUND';

  constructor(message = 'Resource not found', details?: unknown) {
    super(message, details);
  }
}

export class ValidationError extends AppError {
  public readonly statusCode = 400;
  public readonly code = 'VALIDATION_ERROR';

  constructor(message = 'Validation failed', details?: unknown) {
    super(message, details);
  }
}

export class ConflictError extends AppError {
  public readonly statusCode = 409;
  public readonly code = 'CONFLICT';

  constructor(message = 'Resource conflict', details?: unknown) {
    super(message, details);
  }
}
