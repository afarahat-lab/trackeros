import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { settingsSchema } from '../routes/settings-routes';

describe('SC-3: Input validation for PATCH /settings using Zod', () => {
  it('should validate correct input', () => {
    const validInput = { settings: { key1: 'value1' } };
    expect(() => settingsSchema.parse(validInput)).not.toThrow();
  });

  it('should throw error for invalid input', () => {
    const invalidInput = { invalidKey: 'value' };
    expect(() => settingsSchema.parse(invalidInput)).toThrow();
  });
});
