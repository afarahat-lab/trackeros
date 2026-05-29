import { z } from 'zod';

/**
 * Description entity type definition.
 */
export interface Description {
  id: string;
  title: string;
  content: string;
}

/**
 * Zod schema for validating Description input.
 */
export const descriptionSchema = z.object({
  title: z.string().nonempty(),
  content: z.string().nonempty()
});