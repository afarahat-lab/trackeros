
export class NotFoundError extends Error {
  public readonly resourceName: string;
  public readonly resourceId: string;

  constructor(message: string, resourceName: string, resourceId: string) {
    super(message);
    this.name = 'NotFoundError';
    this.resourceName = resourceName;
    this.resourceId = resourceId;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NotFoundError);
    }
  }
}

export class ValidationError extends Error {
  public readonly details: string[];

  constructor(message: string, details: string[]) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }
}

export class ConflictError extends Error {
  public readonly resourceName: string;

  constructor(message: string, resourceName: string) {
    super(message);
    this.name = 'ConflictError';
    this.resourceName = resourceName;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ConflictError);
    }
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UnauthorizedError);
    }
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ForbiddenError);
    }
  }
}
