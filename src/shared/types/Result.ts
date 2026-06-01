/**
 * A generic Result type to handle success and error cases.
 *
 * @template T - The type of the successful result.
 * @template E - The type of the error.
 */
export type Result<T, E> =
  | { success: true; value: T }
  | { success: false; error: E };
