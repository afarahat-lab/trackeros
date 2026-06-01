/**
 * A generic Result type for handling operations that can succeed or fail.
 */
export type Result<T, E> = Success<T> | Failure<E>;

/**
 * Represents a successful operation.
 */
export interface Success<T> {
  success: true;
  value: T;
}

/**
 * Represents a failed operation.
 */
export interface Failure<E> {
  success: false;
  error: E;
}
