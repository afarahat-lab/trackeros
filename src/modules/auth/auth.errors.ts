/**
 * An authentication failure. The `code` is a stable machine constant surfaced
 * in the `{ error, code }` response body; `message` is the human-readable text.
 */
export class AuthenticationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'AuthenticationError';
    this.code = code;
  }
}
