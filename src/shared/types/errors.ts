export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'NOT_FOUND'
  | 'INSUFFICIENT_BALANCE'
  | 'POLICY_VIOLATION';

export interface ErrorResponsePayload {
  error: string;
  code: string;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;

  constructor(message: string, code: ErrorCode, statusCode: number) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.statusCode = statusCode;
  }

  toResponse(): ErrorResponsePayload {
    return { error: this.message, code: this.code };
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Not authorized') {
    super(message, 'AUTHORIZATION_ERROR', 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 'NOT_FOUND', 404);
  }
}

export class InsufficientBalanceError extends AppError {
  constructor(message = 'Insufficient leave balance') {
    super(message, 'INSUFFICIENT_BALANCE', 422);
  }
}

export class OverlapError extends AppError {
  constructor(message = 'Leave request overlaps an existing approved request') {
    super(message, 'POLICY_VIOLATION', 422);
  }
}
