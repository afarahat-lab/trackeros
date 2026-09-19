/**
 * Typed error for HTTP failures. This is the only error type the API client
 * throws, so callers can branch on `status`/`code` without matching strings.
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
