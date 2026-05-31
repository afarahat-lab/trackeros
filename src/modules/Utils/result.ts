/**
 * A type representing a successful or failed operation result.
 *
 * @template T - The type of the successful result.
 * @template E - The type of the error.
 */
export type Result<T, E> =
  | { success: true; data: T }
  | { success: false; error: E };
