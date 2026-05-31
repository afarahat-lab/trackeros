import { z, ZodSchema } from 'zod';

/**
 * Validates a request body against a Zod schema.
 */
export function validateRequest<T>(data: unknown, schema: ZodSchema<T>): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error('Validation failed');
  }
  return result.data;
}
