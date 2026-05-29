import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Unit test for SC-4

describe('SC-4: PATCH /settings input validation using Zod', () => {
  const settingsSchema = z.object({
    settings: z.record(z.string())
  });

  it('should validate correct input', () => {
    const validInput = { settings: { key1: 'value1' } };
    expect(() => settingsSchema.parse(validInput)).not.toThrow();
  });

  it('should throw an error for invalid input', () => {
    const invalidInput = { invalidKey: 'value' };
    expect(() => settingsSchema.parse(invalidInput)).toThrow();
  });
});
