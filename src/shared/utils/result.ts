/**
 * A type representing the result of an operation that can either succeed or fail.
 */
export type Result<T, E> = Success<T> | Failure<E>;

/**
 * A type representing a successful operation.
 */
export interface Success<T> {
  success: true;
  value: T;
}

/**
 * A type representing a failed operation.
 */
export interface Failure<E> {
  success: false;
  error: E;
}
