export class NotFoundError extends Error {
  public readonly statusCode: number = 404;
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  public readonly statusCode: number = 400;
  constructor(message: string = 'Validation failed') {
    super(message);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends Error {
  public readonly statusCode: number = 401;
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ConflictError extends Error {
  public readonly statusCode: number = 409;
  constructor(message: string = 'Conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}
