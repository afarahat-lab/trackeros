export class NotFoundError extends Error {
  public readonly statusCode: number = 404;

  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  public readonly statusCode: number = 422;

  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends Error {
  public readonly statusCode: number = 409;

  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends Error {
  public readonly statusCode: number = 401;

  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}
