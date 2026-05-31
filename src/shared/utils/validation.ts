import { z, ZodSchema } from 'zod';

/**
 * Validates the request body against the provided Zod schema.
 *
 * @param schema - The Zod schema to validate against.
 * @param data - The data to validate.
 * @returns The result of the validation.
 */
export const validateRequestBody = <T>(schema: ZodSchema<T>, data: unknown) => {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error.errors };
  }
};